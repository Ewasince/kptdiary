import { describe, test, expect } from 'vitest';
import { escapeHtml, formatDateTime, renderReport } from '../render';
import type { Entry, Thought } from '../../model/types';

/** Local-time ISO instant for the given local calendar date and time. */
function localIso(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m, d, h, min).toISOString();
}

function thought(overrides: Partial<Thought> = {}): Thought {
  return {
    id: 't1',
    text: 'Я всё испортил',
    belief: 85,
    response: 'Одна ошибка не делает меня плохим',
    responseBelief: 70,
    beliefAfter: 40,
    ...overrides,
  };
}

function completeEntry(overrides: Partial<Entry> = {}): Entry {
  const at = localIso(2026, 9, 19, 22, 15);
  return {
    id: 'e1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    situation: 'Забыл позвонить маме',
    emotions: [
      { name: 'вина', intensity: 80 },
      { name: 'грусть', intensity: 50 },
    ],
    thoughts: [thought()],
    outcomeEmotions: [
      { name: 'вина', intensity: 30 },
      { name: 'спокойствие', intensity: 40 },
    ],
    ...overrides,
  };
}

function incompleteEntry(): Entry {
  const at = localIso(2026, 9, 20, 9, 5);
  return {
    id: 'e2',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    situation: '',
    emotions: [{ name: 'тревога', intensity: null }],
    thoughts: [
      thought({
        id: 't2',
        text: '',
        response: '',
        belief: null,
        responseBelief: null,
        beliefAfter: null,
      }),
    ],
    outcomeEmotions: [],
  };
}

const PERIOD = { from: '2026-10-14', to: '2026-10-20' };
const GENERATED_AT = localIso(2026, 9, 20, 18, 7);

function render(entries: Entry[]): string {
  return renderReport({ entries, period: PERIOD, customEmotions: [], generatedAt: GENERATED_AT });
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('escapeHtml', () => {
  test('escapes markup and quote characters', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    );
  });
});

describe('formatDateTime', () => {
  test('formats local day, genitive month and zero-padded time', () => {
    expect(formatDateTime(localIso(2026, 9, 19, 22, 15))).toBe('19 октября, 22:15');
    expect(formatDateTime(localIso(2026, 2, 3, 7, 5))).toBe('3 марта, 07:05');
  });

  test('appends the year when it differs from the reference year', () => {
    expect(formatDateTime(localIso(2025, 9, 19, 22, 15), GENERATED_AT)).toBe(
      '19 октября 2025, 22:15',
    );
    expect(formatDateTime(localIso(2026, 9, 19, 22, 15), GENERATED_AT)).toBe('19 октября, 22:15');
  });
});

describe('renderReport', () => {
  test('is a standalone Russian document with inline styles', () => {
    const html = render([completeEntry()]);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="ru">');
    expect(html).toContain('<title>Протокол дисфункциональных мыслей</title>');
    expect(html).toContain('@page { size: A4; margin: 16mm }');
    expect(html).toContain('print-color-adjust: exact');
  });

  test('includes period label and counts', () => {
    const doc = parse(render([completeEntry(), incompleteEntry()]));
    const header = doc.querySelector('header')!;
    expect(header.textContent).toContain('Протокол дисфункциональных мыслей');
    expect(header.textContent).toContain('14 октября — 20 октября 2026');
    const counts = [...header.querySelectorAll('.count')].map((el) => ({
      n: el.textContent,
      label: el.nextSibling?.textContent?.trim(),
    }));
    expect(counts).toEqual([
      { n: '2', label: 'записей' },
      { n: '1', label: 'завершены' },
    ]);
  });

  test('renders situation emotions and thought rows', () => {
    const doc = parse(render([completeEntry()]));
    const card = doc.querySelector('article.entry')!;
    expect(card.textContent).toContain('19 октября, 22:15');
    expect(card.textContent).toContain('Ситуация');
    expect(card.textContent).toContain('Забыл позвонить маме');
    expect(card.textContent).toContain('Эмоции');
    const chips = [...card.querySelectorAll('.emotions .chip')].map((c) => c.textContent);
    expect(chips).toEqual(['вина · 80', 'грусть · 50']);

    const heads = [...card.querySelectorAll('table.thoughts th')].map((th) => th.textContent);
    expect(heads).toEqual([
      'Автоматическая мысль',
      'Рациональный ответ',
      'Убедительность мысли: до → после',
    ]);
    const cells = card.querySelectorAll('table.thoughts tbody td');
    expect(cells[0].textContent).toBe('Я всё испортил');
    expect(cells[1].textContent).toBe('Одна ошибка не делает меня плохим (ответ: 70%)');
    expect(cells[2].innerHTML).toBe(
      '<span class="pair"><b>85%</b> → <b class="after">40%</b></span>',
    );
  });

  test('marks unfinished entries', () => {
    const html = render([completeEntry(), incompleteEntry()]);
    expect(html.split('Не завершена')).toHaveLength(2);
    const cards = parse(html).querySelectorAll('article.entry');
    expect(cards[0].querySelector('.badge')).toBeNull();
    expect(cards[1].querySelector('.badge')?.textContent).toBe('Не завершена');
  });

  test('labels empty fields and missing numbers', () => {
    const card = parse(render([incompleteEntry()])).querySelector('article.entry')!;
    expect(card.querySelector('.situation .muted')?.textContent).toBe('не записано');
    const cells = card.querySelectorAll('table.thoughts tbody td');
    expect(cells[0].textContent).toBe('не записано');
    expect(cells[1].textContent).toBe('не записано');
    expect(cells[2].textContent).toBe('— → —');
    expect(card.querySelector('.emotions .chip')?.textContent).toBe('тревога');
    expect(card.querySelector('.outcome')?.textContent).toContain('не записано');
  });

  test('keeps the thoughts table when no thoughts were recorded', () => {
    const card = parse(render([completeEntry({ thoughts: [] })])).querySelector('article.entry')!;
    expect(card.querySelectorAll('table.thoughts th')).toHaveLength(3);
    expect(card.querySelector('table.thoughts tbody td')?.getAttribute('colspan')).toBe('3');
    expect(card.querySelector('table.thoughts tbody')?.textContent).toBe('не записано');
  });

  test('renders before-after pairs', () => {
    const card = parse(render([completeEntry()])).querySelector('article.entry')!;
    const outcome = card.querySelector('.outcome')!;
    expect(outcome.textContent).toContain('Эмоции: до → после');
    const pairs = outcome.querySelectorAll('.pair');
    expect(pairs).toHaveLength(1);
    expect(pairs[0].textContent).toContain('80');
    expect(pairs[0].textContent).toContain('30');
    expect(pairs[0].textContent).toBe('вина · 80 → вина · 30');
    const chips = [...outcome.querySelectorAll(':scope .value > .chip')];
    expect(chips.map((c) => [c.textContent, c.classList.contains('after')])).toEqual([
      ['грусть · 50', false],
      ['спокойствие · 40', true],
    ]);
  });

  test('colors chips from the emotion catalog', () => {
    const chip = parse(render([completeEntry()])).querySelector('.chip') as HTMLElement;
    expect(chip.getAttribute('style')).toMatch(/^background: .+; border-color: .+$/);
  });

  test('escapes user text', () => {
    const html = render([
      completeEntry({
        situation: '<script>alert(1)</script>',
        emotions: [{ name: '<img onerror=x>', intensity: 10 }],
        thoughts: [thought({ text: 'a & b', response: '"q"' })],
      }),
    ]);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img');
    expect(html).toContain('a &amp; b');
    expect(html).toContain('&quot;q&quot;');
  });

  test('escapes numbers too, in case a stored value is not a number', () => {
    const evil = '<img onerror=x>' as unknown as number;
    const html = render([
      completeEntry({
        emotions: [{ name: 'вина', intensity: evil }],
        outcomeEmotions: [{ name: 'вина', intensity: evil }],
        thoughts: [thought({ belief: evil, responseBelief: evil, beliefAfter: evil })],
      }),
    ]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img onerror=x&gt;');
  });

  test('has no external resources', () => {
    const html = render([completeEntry(), incompleteEntry()]);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<link');
  });

  test('renders entries in the given order and a footer', () => {
    const doc = parse(render([completeEntry(), incompleteEntry()]));
    const times = [...doc.querySelectorAll('article.entry .when')].map((el) => el.textContent);
    expect(times).toEqual(['19 октября, 22:15', '20 октября, 09:05']);
    expect(doc.querySelector('footer')?.textContent).toBe('Сформировано 20 октября, 18:07');
  });
});
