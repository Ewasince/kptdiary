import type { CustomEmotion, Diary, EmotionRating, Entry, Thought } from './types';

export const SCHEMA_VERSION = 1;

const NOT_A_BACKUP = 'Файл не похож на бэкап дневника';
const NEWER_VERSION = 'Файл из более новой версии приложения';

/** Raised when an imported file cannot be turned into a current Diary. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export function emptyDiary(): Diary {
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: [],
    customEmotions: [],
    lastReportExportAt: null,
  };
}

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates an imported document and brings it to the current schema.
 * Each future schema version adds one step to the chain here.
 */
export function migrate(raw: unknown): Diary {
  if (
    !isObject(raw) ||
    typeof raw.schemaVersion !== 'number' ||
    !Number.isInteger(raw.schemaVersion) ||
    !Array.isArray(raw.entries)
  ) {
    throw new ImportError(NOT_A_BACKUP);
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(NEWER_VERSION);
  }
  return migrateV1(raw, raw.entries);
}

function migrateV1(raw: RawObject, entries: unknown[]): Diary {
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: entries.map(migrateEntryV1),
    customEmotions: Array.isArray(raw.customEmotions)
      ? [...(raw.customEmotions as CustomEmotion[])]
      : [],
    lastReportExportAt:
      typeof raw.lastReportExportAt === 'string' ? raw.lastReportExportAt : null,
  };
}

function migrateEntryV1(raw: unknown): Entry {
  if (
    !isObject(raw) ||
    typeof raw.id !== 'string' ||
    typeof raw.createdAt !== 'string' ||
    typeof raw.updatedAt !== 'string'
  ) {
    throw new ImportError(NOT_A_BACKUP);
  }
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: (raw.deletedAt as string | null | undefined) ?? null,
    situation: (raw.situation as string | undefined) ?? '',
    emotions: [...((raw.emotions as EmotionRating[] | undefined) ?? [])],
    thoughts: [...((raw.thoughts as Thought[] | undefined) ?? [])],
    outcomeEmotions: [...((raw.outcomeEmotions as EmotionRating[] | undefined) ?? [])],
  };
}
