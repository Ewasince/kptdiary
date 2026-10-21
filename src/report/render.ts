import { isComplete } from '../model/entry';
import { chipColors, lookupEmotion } from '../model/emotions';
import { pairEmotions } from '../model/pairs';
import { MONTHS_GENITIVE, periodLabel, type Period } from '../model/period';
import { plural } from '../model/plural';
import type { CustomEmotion, EmotionRating, Entry, Thought } from '../model/types';
import { REPORT_CSS } from './styles';

export interface ReportInput {
  entries: Entry[];
  period: Period;
  customEmotions: CustomEmotion[];
  generatedAt: string;
}

const TITLE = 'Протокол дисфункциональных мыслей';
const NOT_RECORDED = '<span class="muted">не записано</span>';
const NO_NUMBER = '—';
const ENTRY_FORMS = ['запись', 'записи', 'записей'] as const;
const COMPLETED_FORMS = ['завершена', 'завершены', 'завершены'] as const;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * `"19 октября, 22:15"` in local time; the year is appended when it differs
 * from the year of `referenceIso`.
 */
export function formatDateTime(iso: string, referenceIso?: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const showYear = referenceIso !== undefined && new Date(referenceIso).getFullYear() !== year;
  const day = `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}${showYear ? ` ${year}` : ''}`;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${day}, ${time}`;
}

/** Numbers are escaped as well: a stored value is not guaranteed to be a number. */
function num(value: number): string {
  return escapeHtml(String(value));
}

function textOrMissing(text: string): string {
  return text.trim() === '' ? NOT_RECORDED : escapeHtml(text);
}

function percent(value: number | null): string {
  return value === null ? NO_NUMBER : `${num(value)}%`;
}

/** Before-chips take the family colors; after-chips are green, as in the list. */
function chip(rating: EmotionRating, custom: CustomEmotion[], after = false): string {
  const label =
    rating.intensity === null
      ? escapeHtml(rating.name)
      : `${escapeHtml(rating.name)} · ${num(rating.intensity)}`;
  if (after) return `<span class="chip after">${label}</span>`;
  const colors = chipColors(lookupEmotion(rating.name, custom));
  return `<span class="chip" style="background: ${colors.background}; border-color: ${colors.border}">${label}</span>`;
}

function row(className: string, label: string, value: string): string {
  return `<div class="row ${className}"><span class="label">${label}</span><div class="value">${value}</div></div>`;
}

function emotionsRow(entry: Entry, custom: CustomEmotion[]): string {
  const value =
    entry.emotions.length === 0
      ? NOT_RECORDED
      : entry.emotions.map((r) => chip(r, custom)).join('');
  return row('emotions', 'Эмоции', value);
}

function outcomeRow(entry: Entry, custom: CustomEmotion[]): string {
  if (entry.outcomeEmotions.length === 0) {
    return row('outcome', 'Эмоции: до → после', NOT_RECORDED);
  }
  const chips = pairEmotions(entry).map(({ before, after }) => {
    if (before && after) {
      return `<span class="pair">${chip(before, custom)} → ${chip(after, custom, true)}</span>`;
    }
    if (before) return chip(before, custom);
    return after ? chip(after, custom, true) : '';
  });
  return row('outcome', 'Эмоции: до → после', chips.join(''));
}

function thoughtRow(thought: Thought): string {
  const response =
    thought.responseBelief === null
      ? textOrMissing(thought.response)
      : `${textOrMissing(thought.response)} <span class="muted">(ответ: ${num(thought.responseBelief)}%)</span>`;
  const belief = `<span class="pair"><b>${percent(thought.belief)}</b> → <b class="after-value">${percent(thought.beliefAfter)}</b></span>`;
  return `<tr><td>${textOrMissing(thought.text)}</td><td>${response}</td><td>${belief}</td></tr>`;
}

function thoughtsTable(entry: Entry): string {
  const rows =
    entry.thoughts.length === 0
      ? `<tr><td colspan="3">${NOT_RECORDED}</td></tr>`
      : entry.thoughts.map(thoughtRow).join('');
  return (
    '<table class="thoughts"><thead><tr>' +
    '<th>Автоматическая мысль</th><th>Рациональный ответ</th><th>Убедительность мысли: до → после</th>' +
    `</tr></thead><tbody>${rows}</tbody></table>`
  );
}

function entryCard(entry: Entry, input: ReportInput): string {
  const badge = isComplete(entry) ? '' : '<span class="badge">Не завершена</span>';
  return (
    '<article class="entry">' +
    `<div class="entry-head"><span class="when">${formatDateTime(entry.createdAt, input.generatedAt)}</span>${badge}</div>` +
    row('situation', 'Ситуация', textOrMissing(entry.situation)) +
    emotionsRow(entry, input.customEmotions) +
    thoughtsTable(entry) +
    outcomeRow(entry, input.customEmotions) +
    '</article>'
  );
}

/** Standalone HTML document of the therapist report (spec §5.6). */
export function renderReport(input: ReportInput): string {
  const total = input.entries.length;
  const completed = input.entries.filter(isComplete).length;
  const header =
    '<header>' +
    `<h1>${TITLE}</h1>` +
    `<p class="period">${escapeHtml(periodLabel(input.period))}</p>` +
    `<p class="counts"><span class="count">${num(total)}</span> ${plural(total, ENTRY_FORMS)}` +
    '<span class="sep"> · </span>' +
    `<span class="count">${num(completed)}</span> ${plural(completed, COMPLETED_FORMS)}</p>` +
    '</header>';
  const body = input.entries.map((entry) => entryCard(entry, input)).join('\n');
  const footer = `<footer>Сформировано ${formatDateTime(input.generatedAt)}</footer>`;
  return (
    '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    `<title>${TITLE}</title>\n<style>${REPORT_CSS}</style>\n</head>\n<body>\n` +
    `${header}\n<main>\n${body}\n</main>\n${footer}\n</body>\n</html>\n`
  );
}
