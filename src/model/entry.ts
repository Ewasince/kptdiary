import type { Diary, EmotionRating, Entry, Thought } from './types';

export function createEntry(now: string): Entry {
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    situation: '',
    emotions: [],
    thoughts: [],
    outcomeEmotions: [],
  };
}

export function createThought(): Thought {
  return {
    id: crypto.randomUUID(),
    text: '',
    belief: null,
    response: '',
    responseBelief: null,
    beliefAfter: null,
  };
}

function areRated(ratings: EmotionRating[]): boolean {
  return ratings.length > 0 && ratings.every((rating) => rating.intensity !== null);
}

function isThoughtComplete(thought: Thought): boolean {
  return (
    thought.text.trim() !== '' &&
    thought.belief !== null &&
    thought.response.trim() !== '' &&
    thought.responseBelief !== null &&
    thought.beliefAfter !== null
  );
}

/** Completeness is derived, never stored (spec §3). */
export function isComplete(entry: Entry): boolean {
  return (
    entry.situation.trim() !== '' &&
    areRated(entry.emotions) &&
    entry.thoughts.length > 0 &&
    entry.thoughts.every(isThoughtComplete) &&
    areRated(entry.outcomeEmotions)
  );
}

/** An empty entry has never been anywhere else and may be removed physically. */
export function isEmptyEntry(entry: Entry): boolean {
  return (
    entry.situation.trim() === '' &&
    entry.emotions.length === 0 &&
    entry.thoughts.length === 0 &&
    entry.outcomeEmotions.length === 0
  );
}

export function touch(entry: Entry, now: string): Entry {
  return { ...entry, updatedAt: now };
}

/** Replaces the entry with the same id, or appends it when absent. */
export function replaceEntry(diary: Diary, entry: Entry): Diary {
  const exists = diary.entries.some((existing) => existing.id === entry.id);
  const entries = exists
    ? diary.entries.map((existing) => (existing.id === entry.id ? entry : existing))
    : [...diary.entries, entry];
  return { ...diary, entries };
}

/** Physical removal; soft deletion goes through `deletedAt` instead. */
export function removeEntry(diary: Diary, id: string): Diary {
  return { ...diary, entries: diary.entries.filter((entry) => entry.id !== id) };
}
