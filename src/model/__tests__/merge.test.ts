import { describe, test, expect } from 'vitest';
import { isAheadOf, mergeDiaries, mergeSummary } from '../merge';
import type { Diary, Entry } from '../types';

function entry(id: string, updatedAt: string, patch: Partial<Entry> = {}): Entry {
  return {
    id,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt,
    deletedAt: null,
    situation: `situation ${id}`,
    emotions: [],
    thoughts: [],
    outcomeEmotions: [],
    ...patch,
  };
}

function diary(patch: Partial<Diary> = {}): Diary {
  return {
    schemaVersion: 1,
    entries: [],
    customEmotions: [],
    lastReportExportAt: null,
    ...patch,
  };
}

const T1 = '2026-10-01T10:00:00.000Z';
const T2 = '2026-10-02T10:00:00.000Z';

describe('mergeDiaries', () => {
  test('adds entries missing locally', () => {
    const local = diary({ entries: [entry('a', T1)] });
    const incoming = diary({ entries: [entry('b', T1), entry('a', T1)] });
    const merged = mergeDiaries(local, incoming);
    expect(merged.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(merged.entries[1]).toEqual(incoming.entries[0]);
  });

  test('takes newer updatedAt', () => {
    const local = diary({ entries: [entry('a', T1, { situation: 'old' })] });
    const incoming = diary({ entries: [entry('a', T2, { situation: 'new' })] });
    const merged = mergeDiaries(local, incoming);
    expect(merged.entries).toHaveLength(1);
    expect(merged.entries[0].situation).toBe('new');
  });

  test('keeps local when incoming is older', () => {
    const local = diary({ entries: [entry('a', T2, { situation: 'local' })] });
    const incoming = diary({ entries: [entry('a', T1, { situation: 'incoming' })] });
    expect(mergeDiaries(local, incoming).entries[0].situation).toBe('local');
  });

  test('keeps local on equal updatedAt', () => {
    const local = diary({ entries: [entry('a', T1, { situation: 'local' })] });
    const incoming = diary({ entries: [entry('a', T1, { situation: 'incoming' })] });
    expect(mergeDiaries(local, incoming).entries[0].situation).toBe('local');
  });

  test('newer deletion wins over older edit', () => {
    const local = diary({ entries: [entry('a', T1, { situation: 'edited' })] });
    const incoming = diary({ entries: [entry('a', T2, { deletedAt: T2 })] });
    expect(mergeDiaries(local, incoming).entries[0].deletedAt).toBe(T2);
  });

  test('newer edit revives older deletion', () => {
    const local = diary({ entries: [entry('a', T1, { deletedAt: T1 })] });
    const incoming = diary({ entries: [entry('a', T2, { situation: 'edited' })] });
    const merged = mergeDiaries(local, incoming).entries[0];
    expect(merged.deletedAt).toBeNull();
    expect(merged.situation).toBe('edited');
  });

  test('unions custom emotions preferring local family', () => {
    const local = diary({ customEmotions: [{ name: 'Тоска', family: 'sadness' }] });
    const incoming = diary({
      customEmotions: [
        { name: ' тоска ', family: 'fear' },
        { name: 'Азарт', family: 'anticipation' },
      ],
    });
    expect(mergeDiaries(local, incoming).customEmotions).toEqual([
      { name: 'Тоска', family: 'sadness' },
      { name: 'Азарт', family: 'anticipation' },
    ]);
  });

  test('takes later lastReportExportAt', () => {
    expect(
      mergeDiaries(diary({ lastReportExportAt: T1 }), diary({ lastReportExportAt: T2 }))
        .lastReportExportAt,
    ).toBe(T2);
    expect(
      mergeDiaries(diary({ lastReportExportAt: T2 }), diary({ lastReportExportAt: T1 }))
        .lastReportExportAt,
    ).toBe(T2);
    expect(
      mergeDiaries(diary({ lastReportExportAt: null }), diary({ lastReportExportAt: T1 }))
        .lastReportExportAt,
    ).toBe(T1);
    expect(
      mergeDiaries(diary({ lastReportExportAt: T1 }), diary({ lastReportExportAt: null }))
        .lastReportExportAt,
    ).toBe(T1);
    expect(mergeDiaries(diary(), diary()).lastReportExportAt).toBeNull();
  });

  test('does not mutate inputs', () => {
    const local = diary({
      entries: [entry('a', T1)],
      customEmotions: [{ name: 'Тоска', family: null }],
    });
    const incoming = diary({
      entries: [entry('a', T2), entry('b', T1)],
      customEmotions: [{ name: 'Азарт', family: null }],
    });
    const localCopy = structuredClone(local);
    const incomingCopy = structuredClone(incoming);
    const merged = mergeDiaries(local, incoming);
    expect(local).toEqual(localCopy);
    expect(incoming).toEqual(incomingCopy);
    expect(merged.entries).not.toBe(local.entries);
    expect(merged.customEmotions).not.toBe(local.customEmotions);
  });
});

describe('mergeSummary', () => {
  test('summary counts added updated and custom', () => {
    const local = diary({
      entries: [entry('same', T1), entry('newer', T1), entry('older', T2), entry('local-only', T1)],
      customEmotions: [{ name: 'Тоска', family: 'sadness' }],
    });
    const incoming = diary({
      entries: [
        entry('same', T1),
        entry('newer', T2),
        entry('older', T1),
        entry('new1', T1),
        entry('new2', T1),
      ],
      customEmotions: [
        { name: 'ТОСКА', family: 'fear' },
        { name: 'Азарт', family: null },
      ],
    });
    expect(mergeSummary(local, incoming)).toEqual({ added: 2, updated: 1, customEmotions: 1 });
  });
});

describe('isAheadOf', () => {
  test('is false for the same content in another order', () => {
    const a = diary({ entries: [entry('a', T1), entry('b', T1)] });
    const b = diary({ entries: [entry('b', T1), entry('a', T1)] });
    expect(isAheadOf(a, b)).toBe(false);
  });

  test('ignores ties and custom emotion family conflicts, which merging keeps local', () => {
    const a = diary({
      entries: [entry('a', T1, { situation: 'mine' })],
      customEmotions: [{ name: 'Тоска', family: 'sadness' }],
    });
    const b = diary({
      entries: [entry('a', T1, { situation: 'theirs' })],
      customEmotions: [{ name: 'тоска', family: 'fear' }],
    });
    expect(isAheadOf(a, b)).toBe(false);
  });

  test('is true for a missing or newer entry, a new custom emotion or a later export', () => {
    const base = diary({ entries: [entry('a', T1)] });
    expect(isAheadOf(diary({ entries: [entry('a', T1), entry('b', T1)] }), base)).toBe(true);
    expect(isAheadOf(diary({ entries: [entry('a', T2)] }), base)).toBe(true);
    expect(
      isAheadOf({ ...base, customEmotions: [{ name: 'Азарт', family: null }] }, base),
    ).toBe(true);
    expect(isAheadOf({ ...base, lastReportExportAt: T2 }, base)).toBe(true);
    expect(isAheadOf(base, { ...base, lastReportExportAt: T2 })).toBe(false);
  });
});
