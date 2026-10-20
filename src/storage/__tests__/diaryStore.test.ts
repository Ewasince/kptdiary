import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { emptyDiary } from '../../model/migrate';
import type { Diary } from '../../model/types';
import {
  DIARY_KEY,
  StorageError,
  createDebouncedSaver,
  loadDiary,
  saveDiaryNow,
} from '../diaryStore';

function sampleDiary(): Diary {
  return {
    ...emptyDiary(),
    entries: [
      {
        id: 'e1',
        createdAt: '2026-10-20T10:00:00.000Z',
        updatedAt: '2026-10-20T10:00:00.000Z',
        deletedAt: null,
        situation: 'Meeting',
        emotions: [{ name: 'тревога', intensity: 60 }],
        thoughts: [],
        outcomeEmotions: [],
      },
    ],
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('loads empty diary when key missing', () => {
  expect(loadDiary()).toEqual({ diary: emptyDiary(), corrupted: false });
});

test('round-trips a diary', () => {
  const diary = sampleDiary();
  saveDiaryNow(diary);
  expect(loadDiary()).toEqual({ diary, corrupted: false });
});

test('reports corrupted JSON and leaves value untouched', () => {
  localStorage.setItem(DIARY_KEY, '{not json');
  expect(loadDiary()).toEqual({ diary: emptyDiary(), corrupted: true });
  expect(localStorage.getItem(DIARY_KEY)).toBe('{not json');
});

test('debounced saver writes once after delay', () => {
  vi.useFakeTimers();
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const saver = createDebouncedSaver(300);
  const first = sampleDiary();
  const last = { ...sampleDiary(), customEmotions: [{ name: 'тоска', family: null }] };
  saver.save(first);
  vi.advanceTimersByTime(200);
  saver.save(last);
  vi.advanceTimersByTime(299);
  expect(setItem).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem(DIARY_KEY)!)).toEqual(last);
});

test('flush writes immediately', () => {
  vi.useFakeTimers();
  const saver = createDebouncedSaver(300);
  const diary = sampleDiary();
  saver.save(diary);
  saver.flush();
  expect(JSON.parse(localStorage.getItem(DIARY_KEY)!)).toEqual(diary);
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  vi.advanceTimersByTime(300);
  saver.flush();
  expect(setItem).not.toHaveBeenCalled();
});

test('throws StorageError quota when setItem throws QuotaExceededError', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('full', 'QuotaExceededError');
  });
  let caught: unknown;
  try {
    saveDiaryNow(sampleDiary());
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(StorageError);
  expect((caught as StorageError).kind).toBe('quota');
});
