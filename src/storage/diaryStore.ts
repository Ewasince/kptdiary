import { emptyDiary, migrate } from '../model/migrate';
import type { Diary } from '../model/types';

export const DIARY_KEY = 'kptdiary.diary';
export const LAST_BACKUP_KEY = 'kptdiary.lastBackupAt';

export type LoadResult = { diary: Diary; corrupted: false } | { diary: Diary; corrupted: true };

export class StorageError extends Error {
  readonly kind: 'quota' | 'unknown';
  /** The error thrown by the storage. */
  readonly cause: unknown;

  constructor(kind: 'quota' | 'unknown', cause: unknown) {
    super(kind === 'quota' ? 'Storage quota exceeded' : 'Failed to write to storage');
    this.name = 'StorageError';
    this.kind = kind;
    this.cause = cause;
  }
}

/**
 * Reads the diary. A missing key yields an empty diary; an unreadable value
 * yields an empty diary flagged as corrupted, and the stored value is left as is.
 */
export function loadDiary(storage: Storage = localStorage): LoadResult {
  const raw = storage.getItem(DIARY_KEY);
  if (raw === null) {
    return { diary: emptyDiary(), corrupted: false };
  }
  try {
    return { diary: migrate(JSON.parse(raw)), corrupted: false };
  } catch {
    return { diary: emptyDiary(), corrupted: true };
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
  );
}

/** Writes the diary synchronously; throws StorageError on failure. */
export function saveDiaryNow(diary: Diary, storage: Storage = localStorage): void {
  try {
    storage.setItem(DIARY_KEY, JSON.stringify(diary));
  } catch (e) {
    throw new StorageError(isQuotaError(e) ? 'quota' : 'unknown', e);
  }
}

export interface DebouncedSaver {
  /** Schedules a write of this diary; a later call replaces the pending one. */
  save(diary: Diary): void;
  /** Writes the pending diary right away, if any; throws StorageError on failure. */
  flush(): void;
}

/**
 * Debounces diary writes. Errors from a timer-driven write go to `onError`;
 * every successful write calls `onSaved`.
 */
export function createDebouncedSaver(
  delayMs = 300,
  storage: Storage = localStorage,
  onError?: (e: StorageError) => void,
  onSaved?: () => void,
): DebouncedSaver {
  let pending: Diary | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function writePending(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending === null) return;
    const diary = pending;
    pending = null;
    saveDiaryNow(diary, storage);
    onSaved?.();
  }

  return {
    save(diary) {
      pending = diary;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          writePending();
        } catch (e) {
          onError?.(e as StorageError);
        }
      }, delayMs);
    },
    flush: writePending,
  };
}

export function getLastBackupAt(storage: Storage = localStorage): string | null {
  return storage.getItem(LAST_BACKUP_KEY);
}

export function setLastBackupAt(iso: string, storage: Storage = localStorage): void {
  storage.setItem(LAST_BACKUP_KEY, iso);
}
