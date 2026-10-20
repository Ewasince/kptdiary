import { describe, test, expect } from 'vitest';
import { ImportError, SCHEMA_VERSION, emptyDiary, migrate } from '../migrate';
import type { Diary } from '../types';

const NOT_BACKUP = 'Файл не похож на бэкап дневника';
const NEWER = 'Файл из более новой версии приложения';

function expectImportError(fn: () => unknown, message: string): void {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(ImportError);
  expect((caught as Error).message).toBe(message);
}

const validDiary: Diary = {
  schemaVersion: 1,
  entries: [
    {
      id: 'a',
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T11:00:00.000Z',
      deletedAt: null,
      situation: 'situation',
      emotions: [{ name: 'Радость', intensity: 40 }],
      thoughts: [
        {
          id: 't',
          text: 'thought',
          belief: 80,
          response: 'response',
          responseBelief: 60,
          beliefAfter: 30,
        },
      ],
      outcomeEmotions: [{ name: 'Радость', intensity: 20 }],
    },
  ],
  customEmotions: [{ name: 'Азарт', family: 'anticipation' }],
  lastReportExportAt: '2026-10-05T10:00:00.000Z',
};

describe('emptyDiary', () => {
  test('returns an empty current-version diary', () => {
    expect(emptyDiary()).toEqual({
      schemaVersion: SCHEMA_VERSION,
      entries: [],
      customEmotions: [],
      lastReportExportAt: null,
    });
    expect(emptyDiary().entries).not.toBe(emptyDiary().entries);
  });
});

describe('migrate', () => {
  test('rejects non-object', () => {
    for (const raw of [null, undefined, 42, 'text', [], true]) {
      expectImportError(() => migrate(raw), NOT_BACKUP);
    }
    expectImportError(() => migrate({ entries: [] }), NOT_BACKUP);
    expectImportError(() => migrate({ schemaVersion: '1', entries: [] }), NOT_BACKUP);
    expectImportError(() => migrate({ schemaVersion: 1.5, entries: [] }), NOT_BACKUP);
    expectImportError(() => migrate({ schemaVersion: 1, entries: {} }), NOT_BACKUP);
    expectImportError(() => migrate({ schemaVersion: 1, entries: [null] }), NOT_BACKUP);
    expectImportError(
      () => migrate({ schemaVersion: 1, entries: [{ id: 'a', createdAt: 'x' }] }),
      NOT_BACKUP,
    );
  });

  test('rejects newer schema', () => {
    expectImportError(() => migrate({ schemaVersion: SCHEMA_VERSION + 1, entries: [] }), NEWER);
  });

  test('fills missing fields and drops exportedAt', () => {
    const raw = {
      schemaVersion: 1,
      exportedAt: '2026-10-06T10:00:00.000Z',
      entries: [
        {
          id: 'a',
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T11:00:00.000Z',
        },
      ],
    };
    expect(migrate(raw)).toEqual({
      schemaVersion: 1,
      entries: [
        {
          id: 'a',
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-01T11:00:00.000Z',
          deletedAt: null,
          situation: '',
          emotions: [],
          thoughts: [],
          outcomeEmotions: [],
        },
      ],
      customEmotions: [],
      lastReportExportAt: null,
    });
  });

  test('returns valid diary unchanged', () => {
    const raw = structuredClone(validDiary);
    const migrated = migrate(raw);
    expect(migrated).toEqual(validDiary);
    expect(migrated).not.toBe(raw);
    expect(raw).toEqual(validDiary);
  });
});
