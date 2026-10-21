import { describe, expect, test } from 'vitest';
import { createEntry } from '../entry';
import { pairEmotions } from '../pairs';
import type { EmotionRating, Entry } from '../types';

const r = (name: string, intensity: number | null): EmotionRating => ({ name, intensity });

function entry(fields: Partial<Entry>): Entry {
  return { ...createEntry('2026-10-20T10:00:00.000Z'), ...fields };
}

describe('pairEmotions', () => {
  test('pairs by normalized name, then lists before-only and after-only', () => {
    const e = entry({
      emotions: [r('Вина', 80), r('стыд', 50)],
      outcomeEmotions: [r('радость', 20), r(' вина', 30)],
    });
    expect(pairEmotions(e)).toEqual([
      { name: 'Вина', before: r('Вина', 80), after: r(' вина', 30) },
      { name: 'стыд', before: r('стыд', 50), after: null },
      { name: 'радость', before: null, after: r('радость', 20) },
    ]);
  });

  test('pairs each after-emotion at most once', () => {
    const e = entry({
      emotions: [r('вина', 80), r('Вина', 60)],
      outcomeEmotions: [r('вина', 30)],
    });
    expect(pairEmotions(e)).toEqual([
      { name: 'вина', before: r('вина', 80), after: r('вина', 30) },
      { name: 'Вина', before: r('Вина', 60), after: null },
    ]);
  });
});
