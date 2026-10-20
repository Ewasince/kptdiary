import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Diary } from '../model/types';
import { StorageError, createDebouncedSaver, loadDiary } from '../storage/diaryStore';
import type { DebouncedSaver } from '../storage/diaryStore';
import { requestPersistentStorage } from '../storage/persist';

export interface DiaryContextValue {
  diary: Diary;
  /** The stored value could not be read; `diary` is empty and the value is kept. */
  corrupted: boolean;
  /** Last failed save, cleared by the next successful one. */
  saveError: StorageError | null;
  /** Applies `fn` to the current diary and schedules a debounced save. */
  update(fn: (d: Diary) => Diary): void;
  /** Replaces the whole diary and saves it immediately. */
  replace(diary: Diary): void;
  now(): string;
}

const DiaryContext = createContext<DiaryContextValue | null>(null);

function now(): string {
  return new Date().toISOString();
}

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadDiary());
  const [diary, setDiary] = useState(initial.diary);
  const [saveError, setSaveError] = useState<StorageError | null>(null);
  const diaryRef = useRef(initial.diary);
  const saverRef = useRef<DebouncedSaver | null>(null);
  if (saverRef.current === null) {
    saverRef.current = createDebouncedSaver(
      300,
      localStorage,
      (e) => setSaveError(e),
      () => setSaveError(null),
    );
  }
  const saver = saverRef.current;

  useEffect(() => {
    void requestPersistentStorage().then((granted) => console.info('persistent storage', granted));
  }, []);

  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        saver.flush();
      } catch {
        // The page is going away; nothing left to report the error to.
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saver]);

  const update = useCallback(
    (fn: (d: Diary) => Diary) => {
      const next = fn(diaryRef.current);
      diaryRef.current = next;
      setDiary(next);
      saver.save(next);
    },
    [saver],
  );

  const replace = useCallback(
    (next: Diary) => {
      diaryRef.current = next;
      setDiary(next);
      // Going through the saver drops any pending debounced write of older state.
      saver.save(next);
      try {
        saver.flush();
      } catch (e) {
        setSaveError(e as StorageError);
      }
    },
    [saver],
  );

  const value = useMemo<DiaryContextValue>(
    () => ({ diary, corrupted: initial.corrupted, saveError, update, replace, now }),
    [diary, initial.corrupted, saveError, update, replace],
  );

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const value = useContext(DiaryContext);
  if (value === null) {
    throw new Error('useDiary must be used inside DiaryProvider');
  }
  return value;
}
