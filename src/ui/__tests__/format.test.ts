import { expect, test } from 'vitest';
import { formatDayHeading, formatTime, plural } from '../format';

const local = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const now = local(2026, 10, 20, 12);

test('formatTime uses local time', () => {
  expect(formatTime(local(2026, 10, 20, 18, 40))).toBe('18:40');
  expect(formatTime(local(2026, 10, 20, 7, 5))).toBe('07:05');
});

test('formatDayHeading names today and yesterday by local day', () => {
  expect(formatDayHeading(local(2026, 10, 20, 23, 30), now)).toBe('Сегодня, 20 октября');
  expect(formatDayHeading(local(2026, 10, 20, 0, 10), now)).toBe('Сегодня, 20 октября');
  expect(formatDayHeading(local(2026, 10, 19, 23, 59), now)).toBe('Вчера, 19 октября');
  expect(formatDayHeading(local(2026, 10, 17), now)).toBe('17 октября');
});

test('formatDayHeading appends the year when it differs from now', () => {
  expect(formatDayHeading(local(2025, 10, 17), now)).toBe('17 октября 2025');
  expect(formatDayHeading(local(2025, 12, 31), local(2026, 1, 1))).toBe('Вчера, 31 декабря');
});

test('plural picks the Russian form', () => {
  const forms = ['запись', 'записи', 'записей'] as const;
  expect([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => plural(n, forms))).toEqual([
    'записей',
    'запись',
    'записи',
    'записи',
    'записей',
    'записей',
    'записей',
    'записей',
    'запись',
    'записи',
    'записей',
    'запись',
    'записей',
  ]);
});
