import { describe, test, expect } from 'vitest';
import {
  createEntry,
  createThought,
  isComplete,
  isEmptyEntry,
  removeEntry,
  replaceEntry,
  touch,
} from '../entry';
import type { Diary, Entry } from '../types';

const NOW = '2026-10-20T10:00:00.000Z';
const LATER = '2026-10-20T11:00:00.000Z';

function completeEntry(): Entry {
  return {
    ...createEntry(NOW),
    situation: 'Boss criticised my report',
    emotions: [{ name: 'Тревога', intensity: 70 }],
    thoughts: [
      {
        ...createThought(),
        text: 'I will be fired',
        belief: 80,
        response: 'One remark does not mean dismissal',
        responseBelief: 60,
        beliefAfter: 30,
      },
    ],
    outcomeEmotions: [{ name: 'Тревога', intensity: 30 }],
  };
}

function diaryOf(entries: Entry[]): Diary {
  return { schemaVersion: 1, entries, customEmotions: [], lastReportExportAt: null };
}

describe('createEntry', () => {
  test('createEntry sets timestamps and empty fields', () => {
    const entry = createEntry(NOW);
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(entry.createdAt).toBe(NOW);
    expect(entry.updatedAt).toBe(NOW);
    expect(entry.deletedAt).toBeNull();
    expect(entry.situation).toBe('');
    expect(entry.emotions).toEqual([]);
    expect(entry.thoughts).toEqual([]);
    expect(entry.outcomeEmotions).toEqual([]);
  });

  test('createEntry generates distinct ids', () => {
    expect(createEntry(NOW).id).not.toBe(createEntry(NOW).id);
  });
});

describe('createThought', () => {
  test('createThought has an id and empty fields', () => {
    const thought = createThought();
    expect(thought.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(thought).toEqual({
      id: thought.id,
      text: '',
      belief: null,
      response: '',
      responseBelief: null,
      beliefAfter: null,
    });
  });
});

describe('isComplete', () => {
  test('isComplete true for fully filled entry', () => {
    expect(isComplete(completeEntry())).toBe(true);
  });

  test('isComplete false when outcomeEmotions empty', () => {
    expect(isComplete({ ...completeEntry(), outcomeEmotions: [] })).toBe(false);
  });

  test('isComplete false when a thought beliefAfter is null', () => {
    const entry = completeEntry();
    const thoughts = [{ ...entry.thoughts[0], beliefAfter: null }];
    expect(isComplete({ ...entry, thoughts })).toBe(false);
  });

  test('empty thought text makes entry incomplete', () => {
    const entry = completeEntry();
    const thoughts = [{ ...entry.thoughts[0], text: '   ' }];
    expect(isComplete({ ...entry, thoughts })).toBe(false);
  });

  test('empty thought response makes entry incomplete', () => {
    const entry = completeEntry();
    const thoughts = [{ ...entry.thoughts[0], response: ' ' }];
    expect(isComplete({ ...entry, thoughts })).toBe(false);
  });

  test('isComplete false when situation is blank', () => {
    expect(isComplete({ ...completeEntry(), situation: '  ' })).toBe(false);
  });

  test('isComplete false when no thoughts', () => {
    expect(isComplete({ ...completeEntry(), thoughts: [] })).toBe(false);
  });

  test('isComplete false when an emotion intensity is null', () => {
    const emotions = [{ name: 'Тревога', intensity: null }];
    expect(isComplete({ ...completeEntry(), emotions })).toBe(false);
  });

  test('isComplete false when an outcome emotion intensity is null', () => {
    const outcomeEmotions = [{ name: 'Тревога', intensity: null }];
    expect(isComplete({ ...completeEntry(), outcomeEmotions })).toBe(false);
  });
});

describe('isEmptyEntry', () => {
  test('isEmptyEntry true for fresh entry and false once situation has text', () => {
    const entry = createEntry(NOW);
    expect(isEmptyEntry(entry)).toBe(true);
    expect(isEmptyEntry({ ...entry, situation: '  ' })).toBe(true);
    expect(isEmptyEntry({ ...entry, situation: 'Something happened' })).toBe(false);
  });

  test('isEmptyEntry false once an emotion, thought or outcome emotion is added', () => {
    const entry = createEntry(NOW);
    expect(isEmptyEntry({ ...entry, emotions: [{ name: 'Гнев', intensity: null }] })).toBe(false);
    expect(isEmptyEntry({ ...entry, thoughts: [createThought()] })).toBe(false);
    expect(
      isEmptyEntry({ ...entry, outcomeEmotions: [{ name: 'Гнев', intensity: null }] }),
    ).toBe(false);
  });
});

describe('touch', () => {
  test('touch returns a copy with updatedAt set and leaves the input unchanged', () => {
    const entry = createEntry(NOW);
    const touched = touch(entry, LATER);
    expect(touched).not.toBe(entry);
    expect(touched.updatedAt).toBe(LATER);
    expect(touched.createdAt).toBe(NOW);
    expect(entry.updatedAt).toBe(NOW);
  });
});

describe('replaceEntry', () => {
  test('replaceEntry replaces the entry with the same id without mutating the diary', () => {
    const a = createEntry(NOW);
    const b = createEntry(NOW);
    const diary = diaryOf([a, b]);
    const edited = { ...a, situation: 'edited' };
    const next = replaceEntry(diary, edited);
    expect(next).not.toBe(diary);
    expect(next.entries).not.toBe(diary.entries);
    expect(next.entries).toEqual([edited, b]);
    expect(diary.entries).toEqual([a, b]);
  });

  test('replaceEntry appends the entry when its id is missing', () => {
    const a = createEntry(NOW);
    const b = createEntry(NOW);
    const diary = diaryOf([a]);
    expect(replaceEntry(diary, b).entries).toEqual([a, b]);
    expect(diary.entries).toEqual([a]);
  });
});

describe('removeEntry', () => {
  test('removeEntry physically removes the entry by id without mutating the diary', () => {
    const a = createEntry(NOW);
    const b = createEntry(NOW);
    const diary = diaryOf([a, b]);
    const next = removeEntry(diary, a.id);
    expect(next.entries).toEqual([b]);
    expect(diary.entries).toEqual([a, b]);
  });
});
