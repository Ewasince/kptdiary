import { MONTHS_GENITIVE, localDayKey } from '../model/period';

const MONTHS_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local time of day, `"18:40"`. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `"Сегодня, 20 октября"`, `"Вчера, 19 октября"`, `"17 октября"` or `"17 октября 2025"`. */
export function formatDayHeading(iso: string, now: string): string {
  const date = new Date(iso);
  const today = new Date(now);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const dayMonth = `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}`;
  const key = localDayKey(iso);
  if (key === localDayKey(now)) return `Сегодня, ${dayMonth}`;
  if (key === localDayKey(yesterday.toISOString())) return `Вчера, ${dayMonth}`;
  return date.getFullYear() === today.getFullYear()
    ? dayMonth
    : `${dayMonth} ${date.getFullYear()}`;
}

/** `"Октябрь 2026"`, local. */
export function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  return `${MONTHS_NOMINATIVE[date.getMonth()]} ${date.getFullYear()}`;
}

/** Russian plural form for `n`: forms are for 1, 2–4 and 5+ (`запись, записи, записей`). */
export function plural(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

/** Local `"YYYY-MM-DDTHH:mm"` for `<input type="datetime-local">`. */
export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO datetime from a `datetime-local` value read as local time; null when empty or invalid. */
export function localInputToIso(value: string): string | null {
  if (value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
