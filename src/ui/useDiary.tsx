import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { isAheadOf, mergeDiaries } from '../model/merge';
import { migrate } from '../model/migrate';
import type { Diary } from '../model/types';
import {
  DIARY_KEY,
  StorageError,
  createDebouncedSaver,
  keepUnreadableCopy,
  loadDiary,
} from '../storage/diaryStore';
import type { DebouncedSaver } from '../storage/diaryStore';
import { requestPersistentStorage } from '../storage/persist';

export interface DiaryContextValue {
  diary: Diary;
  /**
   * The stored value could not be read; `diary` is empty and the value is kept.
   * Cleared by `replace`, which overwrites the stored value.
   */
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
  const [initial] = useState(() => {
    const loaded = loadDiary();
    // Every later write overwrites the unreadable value; keep a copy of it first.
    if (loaded.corrupted && loaded.raw !== null) keepUnreadableCopy(loaded.raw);
    return loaded;
  });
  const [diary, setDiary] = useState(initial.diary);
  const [corrupted, setCorrupted] = useState(initial.corrupted);
  const [saveError, setSaveError] = useState<StorageError | null>(null);
  const diaryRef = useRef(initial.diary);
  const saverRef = useRef<DebouncedSaver | null>(null);
  if (saverRef.current === null) {
    saverRef.current = createDebouncedSaver(
      300,
      undefined,
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

  useEffect(() => {
    // Another tab saved the diary: merge its version into ours instead of letting the
    // next save of either tab drop the other's entries.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DIARY_KEY || e.newValue === null || corrupted) return;
      let incoming: Diary;
      try {
        incoming = migrate(JSON.parse(e.newValue));
      } catch {
        return;
      }
      const merged = mergeDiaries(diaryRef.current, incoming);
      diaryRef.current = merged;
      setDiary(merged);
      // The other tab already saved its version; write back only what it lacks. Otherwise
      // the stored value holds everything we have, and a pending save of older state
      // would only overwrite newer data.
      if (isAheadOf(merged, incoming)) saver.save(merged);
      else saver.cancel();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [saver, corrupted]);

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
        // The unreadable stored value has just been overwritten.
        setCorrupted(false);
      } catch (e) {
        setSaveError(e as StorageError);
      }
    },
    [saver],
  );

  const value = useMemo<DiaryContextValue>(
    () => ({ diary, corrupted, saveError, update, replace, now }),
    [diary, corrupted, saveError, update, replace],
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
