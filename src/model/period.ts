import type { Entry } from './types';

export type PeriodPreset = 'day' | 'week' | 'month' | 'all' | 'sinceExport';

/** Inclusive range of local calendar dates, both `YYYY-MM-DD`. */
export interface Period {
  from: string;
  to: string;
}

export interface PresetContext {
  now: string;
  entries: Entry[];
  lastReportExportAt: string | null;
}

export const MONTHS_GENITIVE: readonly string[] = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** `YYYY-MM-DD` of the local calendar day the ISO instant falls on. */
export function localDayKey(iso: string): string {
  return dateKey(new Date(iso));
}

/** Local day key `days` calendar days before the ISO instant's local day. */
function daysBefore(iso: string, days: number): string {
  const date = new Date(iso);
  return dateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - days));
}

export function presetPeriod(preset: PeriodPreset, ctx: PresetContext): Period | null {
  const today = localDayKey(ctx.now);
  switch (preset) {
    case 'day':
      return { from: today, to: today };
    case 'week':
      return { from: daysBefore(ctx.now, 6), to: today };
    case 'month':
      return { from: daysBefore(ctx.now, 29), to: today };
    case 'all': {
      let from = today;
      for (const entry of ctx.entries) {
        if (entry.deletedAt !== null) continue;
        const key = localDayKey(entry.createdAt);
        if (key < from) from = key;
      }
      return { from, to: today };
    }
    case 'sinceExport':
      if (ctx.lastReportExportAt === null) return null;
      return { from: localDayKey(ctx.lastReportExportAt), to: today };
  }
}

/** Non-deleted entries whose local creation day is within the period, oldest first. */
export function entriesInPeriod(entries: Entry[], period: Period): Entry[] {
  return entries
    .filter((entry) => {
      if (entry.deletedAt !== null) return false;
      const key = localDayKey(entry.createdAt);
      return key >= period.from && key <= period.to;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

/** `"2026-10-20"` → `"20 октября"`. */
export function formatDayMonth(key: string): string {
  const [, month, day] = key.split('-').map(Number);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

/** `"20 сентября — 20 октября 2026"`; the year appears once when both dates share it. */
export function periodLabel(period: Period): string {
  const fromYear = period.from.slice(0, 4);
  const toYear = period.to.slice(0, 4);
  const to = `${formatDayMonth(period.to)} ${toYear}`;
  if (period.from === period.to) return to;
  const from =
    fromYear === toYear ? formatDayMonth(period.from) : `${formatDayMonth(period.from)} ${fromYear}`;
  return `${from} — ${to}`;
}
