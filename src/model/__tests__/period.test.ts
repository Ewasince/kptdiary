import { describe, test, expect } from 'vitest';
import {
  entriesInPeriod,
  formatDayMonth,
  localDayKey,
  periodLabel,
  presetPeriod,
} from '../period';
import type { Entry } from '../types';

/** Local-time ISO instant for the given local calendar date and time. */
function localIso(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m, d, h, min).toISOString();
}

function entry(createdAt: string, deletedAt: string | null = null): Entry {
  return {
    id: createdAt,
    createdAt,
    updatedAt: createdAt,
    deletedAt,
    situation: '',
    emotions: [],
    thoughts: [],
    outcomeEmotions: [],
  };
}

// 2026-10-20 12:00 local.
const NOW = localIso(2026, 9, 20);
const ctx = (entries: Entry[] = [], lastReportExportAt: string | null = null) => ({
  now: NOW,
  entries,
  lastReportExportAt,
});

describe('presetPeriod', () => {
  test('day preset is today', () => {
    expect(presetPeriod('day', ctx())).toEqual({ from: '2026-10-20', to: '2026-10-20' });
  });

  test('week preset spans 7 days including today', () => {
    expect(presetPeriod('week', ctx())).toEqual({ from: '2026-10-14', to: '2026-10-20' });
  });

  test('month preset spans 30 days', () => {
    expect(presetPeriod('month', ctx())).toEqual({ from: '2026-09-21', to: '2026-10-20' });
  });

  test('all preset starts at earliest entry', () => {
    const entries = [
      entry(localIso(2026, 8, 3)),
      entry(localIso(2026, 7, 1), localIso(2026, 7, 2)),
      entry(localIso(2026, 6, 15)),
      entry(localIso(2026, 9, 1)),
    ];
    expect(presetPeriod('all', ctx(entries))).toEqual({ from: '2026-07-15', to: '2026-10-20' });
    expect(presetPeriod('all', ctx())).toEqual({ from: '2026-10-20', to: '2026-10-20' });
  });

  test('all preset reaches the latest entry when it is dated after today', () => {
    const entries = [
      entry(localIso(2026, 9, 1)),
      entry(localIso(2026, 9, 25)),
      entry(localIso(2026, 10, 3), localIso(2026, 9, 20)),
    ];
    expect(presetPeriod('all', ctx(entries))).toEqual({ from: '2026-10-01', to: '2026-10-25' });
  });

  test('sinceExport uses lastReportExportAt day', () => {
    const exportedAt = localIso(2026, 9, 5, 23, 30);
    expect(presetPeriod('sinceExport', ctx([], exportedAt))).toEqual({
      from: '2026-10-05',
      to: '2026-10-20',
    });
  });

  test('sinceExport without export is null', () => {
    expect(presetPeriod('sinceExport', ctx())).toBeNull();
  });
});

describe('localDayKey', () => {
  test('uses local calendar days', () => {
    const iso = new Date(2026, 9, 12, 23, 30).toISOString();
    expect(localDayKey(iso)).toBe('2026-10-12');
    const late = entry(iso);
    expect(entriesInPeriod([late], { from: '2026-10-12', to: '2026-10-12' })).toEqual([late]);
    expect(entriesInPeriod([late], { from: '2026-10-13', to: '2026-10-13' })).toEqual([]);
  });

  test('zero-pads month and day', () => {
    expect(localDayKey(localIso(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('entriesInPeriod', () => {
  test('entriesInPeriod excludes deleted and sorts ascending', () => {
    const a = entry(localIso(2026, 9, 3, 9));
    const b = entry(localIso(2026, 9, 1, 0, 5));
    const c = entry(localIso(2026, 9, 3, 8));
    const deleted = entry(localIso(2026, 9, 2), localIso(2026, 9, 4));
    const before = entry(localIso(2026, 8, 30, 23, 59));
    const after = entry(localIso(2026, 9, 4, 0, 1));
    const result = entriesInPeriod([a, b, deleted, before, after, c], {
      from: '2026-10-01',
      to: '2026-10-03',
    });
    expect(result).toEqual([b, c, a]);
  });
});

describe('periodLabel', () => {
  test('periodLabel formats ranges', () => {
    expect(periodLabel({ from: '2026-10-20', to: '2026-10-20' })).toBe('20 октября 2026');
    expect(periodLabel({ from: '2026-09-20', to: '2026-10-20' })).toBe(
      '20 сентября — 20 октября 2026',
    );
    expect(periodLabel({ from: '2025-12-20', to: '2026-01-05' })).toBe(
      '20 декабря 2025 — 5 января 2026',
    );
  });

  test('formatDayMonth drops leading zeros', () => {
    expect(formatDayMonth('2026-03-01')).toBe('1 марта');
    expect(formatDayMonth('2026-10-20')).toBe('20 октября');
  });
});
