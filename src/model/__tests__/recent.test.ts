import { describe, test, expect } from 'vitest';
import { recentEmotions } from '../recent';
import type { EmotionRating, Entry } from '../types';

const NOW = '2026-10-20T12:00:00.000Z';
const DAY = 86400000;

function daysAgo(days: number): string {
  return new Date(Date.parse(NOW) - days * DAY).toISOString();
}

function rate(...names: string[]): EmotionRating[] {
  return names.map((name) => ({ name, intensity: 50 }));
}

function entry(
  createdAt: string,
  emotions: EmotionRating[],
  outcomeEmotions: EmotionRating[] = [],
  deletedAt: string | null = null,
): Entry {
  return {
    id: createdAt,
    createdAt,
    updatedAt: createdAt,
    deletedAt,
    situation: '',
    emotions,
    thoughts: [],
    outcomeEmotions,
  };
}

describe('recentEmotions', () => {
  test('counts emotions across both lists within 30 days', () => {
    const entries = [
      entry(daysAgo(1), rate('тревога'), rate('Грусть')),
      entry(daysAgo(2), rate('грусть'), rate('тревога ')),
      entry(daysAgo(3), rate('грусть')),
    ];
    expect(recentEmotions(entries, NOW)).toEqual(['грусть', 'тревога']);
  });

  test('ignores deleted and older entries', () => {
    const entries = [
      entry(daysAgo(1), rate('тревога')),
      entry(daysAgo(30), rate('злость')),
      entry(daysAgo(31), rate('гнев', 'гнев')),
      entry(daysAgo(2), rate('ужас'), [], daysAgo(1)),
    ];
    expect(recentEmotions(entries, NOW)).toEqual(['тревога', 'злость']);
  });

  test('ties broken by latest use', () => {
    const entries = [
      entry(daysAgo(5), rate('печаль')),
      entry(daysAgo(1), rate('интерес')),
      entry(daysAgo(3), rate('скука')),
    ];
    expect(recentEmotions(entries, NOW)).toEqual(['интерес', 'скука', 'печаль']);
  });

  test('respects limit', () => {
    const names = ['а', 'б', 'в', 'г', 'д', 'е', 'ж', 'з', 'и', 'к'];
    const entries = names.map((n, i) => entry(daysAgo(i + 1), rate(n)));
    expect(recentEmotions(entries, NOW)).toEqual(names.slice(0, 8));
    expect(recentEmotions(entries, NOW, 3)).toEqual(['а', 'б', 'в']);
  });
});
