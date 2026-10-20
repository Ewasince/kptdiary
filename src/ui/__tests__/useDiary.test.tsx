import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DIARY_KEY } from '../../storage/diaryStore';
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
