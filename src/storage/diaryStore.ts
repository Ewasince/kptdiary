import { emptyDiary, migrate } from '../model/migrate';
import type { Diary } from '../model/types';

export const DIARY_KEY = 'kptdiary.diary';
export const LAST_BACKUP_KEY = 'kptdiary.lastBackupAt';
/** Holds a copy of a stored value that could not be read, before it is overwritten. */
export const UNREADABLE_KEY = 'kptdiary.diary.unreadable';

export type LoadResult =
  | { diary: Diary; corrupted: false }
  /** `raw` is the unreadable stored value, or null when the storage itself refused access. */
  | { diary: Diary; corrupted: true; raw: string | null };

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
 * Reads the diary. A missing key yields an empty diary; an unreadable value, or a
 * storage that refuses access (SecurityError), yields an empty diary flagged as
 * corrupted, and the stored value is left as is.
 */
export function loadDiary(storage?: Storage): LoadResult {
  let raw: string | null;
  try {
    // Even reading the `localStorage` global throws when site data is blocked.
    raw = (storage ?? localStorage).getItem(DIARY_KEY);
  } catch {
    return { diary: emptyDiary(), corrupted: true, raw: null };
  }
  if (raw === null) {
    return { diary: emptyDiary(), corrupted: false };
  }
  try {
    return { diary: migrate(JSON.parse(raw)), corrupted: false };
  } catch {
    return { diary: emptyDiary(), corrupted: true, raw };
  }
}

/**
 * Copies an unreadable stored value to UNREADABLE_KEY, unless an earlier copy is
 * already there; failures are ignored, there is nothing better to do with them.
 */
export function keepUnreadableCopy(raw: string, storage?: Storage): void {
  try {
    const target = storage ?? localStorage;
    if (target.getItem(UNREADABLE_KEY) === null) target.setItem(UNREADABLE_KEY, raw);
  } catch {
    // Storage is unavailable or full; the original value is still in place for now.
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
  );
}

/** Writes the diary synchronously; throws StorageError on failure. */
export function saveDiaryNow(diary: Diary, storage?: Storage): void {
  try {
    (storage ?? localStorage).setItem(DIARY_KEY, JSON.stringify(diary));
  } catch (e) {
    throw new StorageError(isQuotaError(e) ? 'quota' : 'unknown', e);
  }
}

export interface DebouncedSaver {
  /** Schedules a write of this diary; a later call replaces the pending one. */
  save(diary: Diary): void;
  /** Writes the pending diary right away, if any; throws StorageError on failure. */
  flush(): void;
  /** Drops the pending write, if any. */
  cancel(): void;
}

/**
 * Debounces diary writes. Errors from a timer-driven write go to `onError`;
 * every successful write calls `onSaved`.
 */
export function createDebouncedSaver(
  delayMs = 300,
  storage?: Storage,
  onError?: (e: StorageError) => void,
  onSaved?: () => void,
): DebouncedSaver {
  let pending: Diary | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function writePending(): void {
    clearTimer();
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
    cancel() {
      clearTimer();
      pending = null;
    },
  };
}

/** Null when there was none or the storage refuses access. */
export function getLastBackupAt(storage?: Storage): string | null {
  try {
    return (storage ?? localStorage).getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function setLastBackupAt(iso: string, storage?: Storage): void {
  (storage ?? localStorage).setItem(LAST_BACKUP_KEY, iso);
}
