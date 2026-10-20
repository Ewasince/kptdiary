import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createEntry } from '../../model/entry';
import { emptyDiary } from '../../model/migrate';
import type { Diary, Entry } from '../../model/types';
import { DIARY_KEY, UNREADABLE_KEY } from '../../storage/diaryStore';
import { DiaryProvider, useDiary } from '../useDiary';

const wrapper = ({ children }: { children: ReactNode }) => (
  <DiaryProvider>{children}</DiaryProvider>
);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('update changes diary and persists after debounce', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useDiary(), { wrapper });
  expect(result.current.corrupted).toBe(false);
  act(() => {
    result.current.update((d) => ({ ...d, lastReportExportAt: '2026-10-20T10:00:00.000Z' }));
  });
  expect(result.current.diary.lastReportExportAt).toBe('2026-10-20T10:00:00.000Z');
  expect(localStorage.getItem(DIARY_KEY)).toBeNull();
  act(() => vi.advanceTimersByTime(300));
  expect(JSON.parse(localStorage.getItem(DIARY_KEY)!).lastReportExportAt).toBe(
    '2026-10-20T10:00:00.000Z',
  );
  expect(result.current.saveError).toBeNull();
});

test('replace persists immediately', () => {
  const { result } = renderHook(() => useDiary(), { wrapper });
  const next = {
    ...result.current.diary,
    customEmotions: [{ name: 'тоска', family: 'sadness' as const }],
  };
  act(() => result.current.replace(next));
  expect(result.current.diary).toEqual(next);
  expect(JSON.parse(localStorage.getItem(DIARY_KEY)!)).toEqual(next);
});

test('replace clears the corrupted flag', () => {
  localStorage.setItem(DIARY_KEY, '{bad json');
  const { result } = renderHook(() => useDiary(), { wrapper });
  expect(result.current.corrupted).toBe(true);
  act(() => result.current.replace(emptyDiary()));
  expect(result.current.corrupted).toBe(false);
});

function entryAt(id: string, updatedAt: string): Entry {
  return { ...createEntry(updatedAt), id, situation: id };
}

function diaryWith(...entries: Entry[]): Diary {
  return { ...emptyDiary(), entries };
}

function storageEvent(newValue: string | null, key: string = DIARY_KEY): StorageEvent {
  return new StorageEvent('storage', { key, newValue });
}

test('a write from another tab is merged in without saving it back', () => {
  vi.useFakeTimers();
  const mine = entryAt('mine', '2026-10-20T10:00:00.000Z');
  localStorage.setItem(DIARY_KEY, JSON.stringify(diaryWith(mine)));
  const { result } = renderHook(() => useDiary(), { wrapper });
  const theirs = entryAt('theirs', '2026-10-20T11:00:00.000Z');
  const written = JSON.stringify(diaryWith(mine, theirs));
  localStorage.setItem(DIARY_KEY, written);
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  act(() => {
    window.dispatchEvent(storageEvent(written));
  });
  expect(result.current.diary.entries.map((e) => e.id)).toEqual(['mine', 'theirs']);
  act(() => vi.advanceTimersByTime(300));
  expect(setItem).not.toHaveBeenCalled();
});

test('a write from another tab that lacks local changes is merged and saved', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useDiary(), { wrapper });
  act(() => {
    result.current.update((d) => ({
      ...d,
      entries: [entryAt('mine', '2026-10-20T10:00:00.000Z')],
    }));
  });
  const written = JSON.stringify(diaryWith(entryAt('theirs', '2026-10-20T11:00:00.000Z')));
  localStorage.setItem(DIARY_KEY, written);
  act(() => {
    window.dispatchEvent(storageEvent(written));
  });
  expect(result.current.diary.entries.map((e) => e.id)).toEqual(['mine', 'theirs']);
  act(() => vi.advanceTimersByTime(300));
  const saved = JSON.parse(localStorage.getItem(DIARY_KEY)!) as Diary;
  expect(saved.entries.map((e) => e.id)).toEqual(['mine', 'theirs']);
});

test('ignores unrelated, cleared and unreadable storage events', () => {
  const { result } = renderHook(() => useDiary(), { wrapper });
  const before = result.current.diary;
  const other = JSON.stringify(diaryWith(entryAt('x', '2026-10-20T11:00:00.000Z')));
  act(() => {
    window.dispatchEvent(storageEvent(other, 'something.else'));
    window.dispatchEvent(storageEvent(null));
    window.dispatchEvent(storageEvent('{bad json'));
  });
  expect(result.current.diary).toBe(before);
});

test('ignores storage events while the stored value is unreadable', () => {
  localStorage.setItem(DIARY_KEY, '{bad json');
  const { result } = renderHook(() => useDiary(), { wrapper });
  const other = JSON.stringify(diaryWith(entryAt('x', '2026-10-20T11:00:00.000Z')));
  act(() => {
    window.dispatchEvent(storageEvent(other));
  });
  expect(result.current.diary.entries).toEqual([]);
});

test('an unreadable stored value is copied aside before it is overwritten', () => {
  vi.useFakeTimers();
  localStorage.setItem(DIARY_KEY, '{bad json');
  const { result } = renderHook(() => useDiary(), { wrapper });
  act(() => {
    result.current.update((d) => ({ ...d, lastReportExportAt: '2026-10-20T10:00:00.000Z' }));
  });
  act(() => vi.advanceTimersByTime(300));
  expect(localStorage.getItem(UNREADABLE_KEY)).toBe('{bad json');
  expect(JSON.parse(localStorage.getItem(DIARY_KEY)!).lastReportExportAt).toBe(
    '2026-10-20T10:00:00.000Z',
  );
});

test('an earlier unreadable copy is not replaced', () => {
  localStorage.setItem(UNREADABLE_KEY, 'first');
  localStorage.setItem(DIARY_KEY, '{bad json');
  renderHook(() => useDiary(), { wrapper });
  expect(localStorage.getItem(UNREADABLE_KEY)).toBe('first');
});

test('storage that refuses access is treated as unreadable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied', 'SecurityError');
  });
  const { result } = renderHook(() => useDiary(), { wrapper });
  expect(result.current.corrupted).toBe(true);
  expect(result.current.diary).toEqual(emptyDiary());
});

test('a newer write from another tab drops our pending older save', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useDiary(), { wrapper });
  act(() => {
    result.current.update((d) => ({ ...d, entries: [entryAt('a', '2026-10-20T10:00:00.000Z')] }));
  });
  const theirs = { ...entryAt('a', '2026-10-20T11:00:00.000Z'), situation: 'theirs' };
  const written = JSON.stringify(diaryWith(theirs));
  localStorage.setItem(DIARY_KEY, written);
  act(() => {
    window.dispatchEvent(storageEvent(written));
  });
  expect(result.current.diary.entries).toEqual([theirs]);
  act(() => vi.advanceTimersByTime(300));
  expect(localStorage.getItem(DIARY_KEY)).toBe(written);
});
