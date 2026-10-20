import { FAMILIES } from './emotions';
import type {
  CustomEmotion,
  Diary,
  EmotionFamily,
  EmotionRating,
  Entry,
  Thought,
} from './types';

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
 * Every field is checked, since a stored document is trusted by the whole app.
 */
export function migrate(raw: unknown): Diary {
  if (
    !isObject(raw) ||
    typeof raw.schemaVersion !== 'number' ||
    !Number.isInteger(raw.schemaVersion) ||
    raw.schemaVersion < 1 ||
    !Array.isArray(raw.entries)
  ) {
    throw new ImportError(NOT_A_BACKUP);
  }
  if (raw.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError(NEWER_VERSION);
  }
  return migrateV1(raw, raw.entries);
}

function fail(): never {
  throw new ImportError(NOT_A_BACKUP);
}

function nonEmptyString(value: unknown): string {
  return typeof value === 'string' && value !== '' ? value : fail();
}

function stringOr(value: unknown, fallback: string): string {
  if (value === undefined) return fallback;
  return typeof value === 'string' ? value : fail();
}

function nullableString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return typeof value === 'string' ? value : fail();
}

/** `null` (or missing) or an integer within [min, max]. */
function nullableInt(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null) return null;
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fail();
}

function arrayOf<T>(value: unknown, item: (raw: unknown) => T): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value.map(item) : fail();
}

const FAMILY_IDS: ReadonlySet<string> = new Set(FAMILIES.map((f) => f.id));

function migrateV1(raw: RawObject, entries: unknown[]): Diary {
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: dedupeById(entries.map(migrateEntryV1)),
    customEmotions: arrayOf(raw.customEmotions, migrateCustomEmotionV1),
    lastReportExportAt:
      typeof raw.lastReportExportAt === 'string' ? raw.lastReportExportAt : null,
  };
}

/** Keeps one entry per id, the one with the latest `updatedAt`, at the first id's position. */
function dedupeById(entries: Entry[]): Entry[] {
  const latest = new Map<string, Entry>();
  for (const entry of entries) {
    const seen = latest.get(entry.id);
    if (seen === undefined || entry.updatedAt > seen.updatedAt) latest.set(entry.id, entry);
  }
  return [...latest.values()];
}

function migrateEntryV1(raw: unknown): Entry {
  if (!isObject(raw)) fail();
  return {
    id: nonEmptyString(raw.id),
    createdAt: nonEmptyString(raw.createdAt),
    updatedAt: nonEmptyString(raw.updatedAt),
    deletedAt: nullableString(raw.deletedAt),
    situation: stringOr(raw.situation, ''),
    emotions: arrayOf(raw.emotions, migrateRatingV1),
    thoughts: arrayOf(raw.thoughts, migrateThoughtV1),
    outcomeEmotions: arrayOf(raw.outcomeEmotions, migrateRatingV1),
  };
}

function migrateRatingV1(raw: unknown): EmotionRating {
  if (!isObject(raw)) fail();
  return { name: nonEmptyString(raw.name), intensity: nullableInt(raw.intensity, 1, 100) };
}

function migrateThoughtV1(raw: unknown): Thought {
  if (!isObject(raw) || typeof raw.text !== 'string' || typeof raw.response !== 'string') fail();
  return {
    id: nonEmptyString(raw.id),
    text: raw.text,
    belief: nullableInt(raw.belief, 0, 100),
    response: raw.response,
    responseBelief: nullableInt(raw.responseBelief, 0, 100),
    beliefAfter: nullableInt(raw.beliefAfter, 0, 100),
  };
}

function migrateCustomEmotionV1(raw: unknown): CustomEmotion {
  if (!isObject(raw)) fail();
  const family = raw.family ?? null;
  if (family !== null && (typeof family !== 'string' || !FAMILY_IDS.has(family))) fail();
  return { name: nonEmptyString(raw.name), family: family as EmotionFamily | null };
}
