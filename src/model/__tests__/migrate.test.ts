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

describe('migrate validation', () => {
  type RawEntry = Record<string, unknown>;

  function withEntry(overrides: RawEntry): unknown {
    const raw = structuredClone(validDiary) as unknown as { entries: RawEntry[] };
    raw.entries[0] = { ...raw.entries[0], ...overrides };
    return raw;
  }

  function withThought(overrides: RawEntry): unknown {
    const thought = { ...validDiary.entries[0].thoughts[0], ...overrides };
    return withEntry({ thoughts: [thought] });
  }

  function withCustom(custom: unknown[]): unknown {
    return { ...structuredClone(validDiary), customEmotions: custom };
  }

  test('rejects a non-string situation', () => {
    expectImportError(() => migrate(withEntry({ situation: 5 })), NOT_BACKUP);
  });

  test('rejects emotions that are not an array of ratings', () => {
    expectImportError(() => migrate(withEntry({ emotions: 'ab' })), NOT_BACKUP);
    expectImportError(() => migrate(withEntry({ emotions: ['a'] })), NOT_BACKUP);
    expectImportError(() => migrate(withEntry({ emotions: [{ intensity: 5 }] })), NOT_BACKUP);
    expectImportError(
      () => migrate(withEntry({ outcomeEmotions: [{ name: '', intensity: 5 }] })),
      NOT_BACKUP,
    );
  });

  test('rejects an intensity that is not null or an integer 1–100', () => {
    for (const intensity of ['<img onerror=alert(1)>', 0, 101, 2.5, '40']) {
      expectImportError(
        () => migrate(withEntry({ emotions: [{ name: 'Радость', intensity }] })),
        NOT_BACKUP,
      );
    }
  });

  test('rejects a thought without text', () => {
    const withoutText: Record<string, unknown> = { ...validDiary.entries[0].thoughts[0] };
    delete withoutText.text;
    expectImportError(() => migrate(withEntry({ thoughts: [withoutText] })), NOT_BACKUP);
    expectImportError(() => migrate(withThought({ response: 3 })), NOT_BACKUP);
    expectImportError(() => migrate(withEntry({ thoughts: 'x' })), NOT_BACKUP);
  });

  test('rejects a belief that is not null or an integer 0–100', () => {
    for (const value of [-1, 101, 0.5, '50']) {
      expectImportError(() => migrate(withThought({ belief: value })), NOT_BACKUP);
      expectImportError(() => migrate(withThought({ responseBelief: value })), NOT_BACKUP);
      expectImportError(() => migrate(withThought({ beliefAfter: value })), NOT_BACKUP);
    }
  });

  test('rejects a custom emotion with an unknown family', () => {
    expectImportError(() => migrate(withCustom([{ name: 'Злоба', family: 'evil' }])), NOT_BACKUP);
  });

  test('rejects a custom emotion without a name', () => {
    expectImportError(() => migrate(withCustom([{ family: 'joy' }])), NOT_BACKUP);
    expectImportError(() => migrate(withCustom([{ name: '', family: null }])), NOT_BACKUP);
  });

  test('rejects bad entry ids and dates', () => {
    expectImportError(() => migrate(withEntry({ id: '' })), NOT_BACKUP);
    expectImportError(() => migrate(withEntry({ createdAt: '' })), NOT_BACKUP);
    expectImportError(() => migrate(withEntry({ deletedAt: 5 })), NOT_BACKUP);
  });

  test('rejects schema versions below 1', () => {
    expectImportError(() => migrate({ schemaVersion: 0, entries: [] }), NOT_BACKUP);
    expectImportError(() => migrate({ schemaVersion: -1, entries: [] }), NOT_BACKUP);
  });

  test('keeps the latest copy of a duplicated entry id', () => {
    const older = { ...validDiary.entries[0], situation: 'older' };
    const newer = {
      ...validDiary.entries[0],
      situation: 'newer',
      updatedAt: '2026-10-02T00:00:00.000Z',
    };
    const migrated = migrate({ ...validDiary, entries: [older, newer, { ...older }] });
    expect(migrated.entries).toHaveLength(1);
    expect(migrated.entries[0].situation).toBe('newer');
  });

  test('accepts null intensities and beliefs and a null family', () => {
    const raw = withCustom([{ name: 'Азарт', family: null }]) as { entries: RawEntry[] };
    raw.entries[0].emotions = [{ name: 'Радость', intensity: null }];
    raw.entries[0].thoughts = [
      { id: 't', text: '', belief: null, response: '', responseBelief: null, beliefAfter: null },
    ];
    expect(() => migrate(raw)).not.toThrow();
  });
});
