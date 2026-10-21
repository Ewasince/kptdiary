import { normalizeEmotionName } from './emotions';
import type { EmotionRating, Entry } from './types';

export interface EmotionPair {
  name: string;
  before: EmotionRating | null;
  after: EmotionRating | null;
}

/**
 * Before/after pairs for emotions present in both lists (matched by normalized name,
 * named after the before side), then before-only, then after-only emotions, each with
 * the other side null.
 */
export function pairEmotions(entry: Entry): EmotionPair[] {
  const unmatched = [...entry.outcomeEmotions];
  const pairs: EmotionPair[] = [];
  const beforeOnly: EmotionPair[] = [];
  for (const before of entry.emotions) {
    const key = normalizeEmotionName(before.name);
    const index = unmatched.findIndex((after) => normalizeEmotionName(after.name) === key);
    if (index === -1) {
      beforeOnly.push({ name: before.name, before, after: null });
    } else {
      pairs.push({ name: before.name, before, after: unmatched[index] });
      unmatched.splice(index, 1);
    }
  }
  const afterOnly = unmatched.map((after) => ({ name: after.name, before: null, after }));
  return [...pairs, ...beforeOnly, ...afterOnly];
}
