import { describe, test, expect } from 'vitest';
import {
  DYADS,
  FAMILIES,
  allEmotionNames,
  chipColors,
  familyNeighbors,
  lookupEmotion,
  normalizeEmotionName,
  searchEmotions,
} from '../emotions';

describe('catalog', () => {
  test('FAMILIES has 8 entries in spec order', () => {
    expect(FAMILIES.map((f) => f.id)).toEqual([
      'joy',
      'trust',
      'fear',
      'surprise',
      'sadness',
      'disgust',
      'anger',
      'anticipation',
    ]);
    expect(FAMILIES[0].id).toBe('joy');
    expect(FAMILIES[2]).toEqual({
      id: 'fear',
      label: 'страх',
      color: '#C9C534',
      levels: ['тревога', 'страх', 'ужас'],
    });
  });

  test('DYADS pair adjacent families clockwise', () => {
    expect(DYADS.map((d) => d.name)).toEqual([
      'любовь',
      'покорность',
      'трепет',
      'разочарование',
      'раскаяние',
      'презрение',
      'агрессия',
      'оптимизм',
    ]);
    expect(DYADS[0].families).toEqual(['joy', 'trust']);
    expect(DYADS[7].families).toEqual(['anticipation', 'joy']);
  });
});

describe('normalizeEmotionName', () => {
  test('trims, lowercases and collapses whitespace', () => {
    expect(normalizeEmotionName('  Лёгкая   ГРУСТЬ \t')).toBe('лёгкая грусть');
  });
});

describe('lookupEmotion', () => {
  test('lookupEmotion(ужас) is fear level 3', () => {
    expect(lookupEmotion('ужас', [])).toEqual({
      name: 'ужас',
      family: 'fear',
      level: 3,
      dyad: false,
      color: '#C9C534',
    });
  });

  test('normalizes name case and whitespace', () => {
    const info = lookupEmotion(' Тревога  ', []);
    expect(info.name).toBe('тревога');
    expect(info.family).toBe('fear');
    expect(info.level).toBe(1);
  });

  test('lookupEmotion(покорность) is dyad of trust and fear', () => {
    expect(lookupEmotion('покорность', [])).toEqual({
      name: 'покорность',
      family: 'trust',
      level: null,
      dyad: true,
      color: '#F2D63B',
    });
  });

  test('custom emotion with family gets family color', () => {
    const info = lookupEmotion('Обида', [{ name: 'обида', family: 'sadness' }]);
    expect(info).toEqual({
      name: 'обида',
      family: 'sadness',
      level: null,
      dyad: false,
      color: '#9FCBE5',
    });
  });

  test('custom emotion without family is neutral', () => {
    const info = lookupEmotion('обида', [{ name: 'обида', family: null }]);
    expect(info.family).toBeNull();
    expect(info.color).toBe('#9AA5AF');
  });

  test('unknown name has null family and neutral color', () => {
    expect(lookupEmotion('нечто', [])).toEqual({
      name: 'нечто',
      family: null,
      level: null,
      dyad: false,
      color: '#9AA5AF',
    });
  });

  test('catalog takes precedence over custom', () => {
    const info = lookupEmotion('страх', [{ name: 'страх', family: 'joy' }]);
    expect(info.family).toBe('fear');
    expect(info.level).toBe(2);
  });
});

describe('allEmotionNames', () => {
  test('lists levels, then dyads, then custom without duplicates', () => {
    const names = allEmotionNames([
      { name: 'обида', family: null },
      { name: 'страх', family: 'fear' },
    ]);
    expect(names).toHaveLength(8 * 3 + 8 + 1);
    expect(names.slice(0, 3)).toEqual(['безмятежность', 'радость', 'восторг']);
    expect(names[24]).toBe('любовь');
    expect(names[names.length - 1]).toBe('обида');
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('searchEmotions', () => {
  test('searchEmotions(тре) contains тревога and трепет', () => {
    const found = searchEmotions('тре', []);
    expect(found).toContain('тревога');
    expect(found).toContain('трепет');
    expect(found).not.toContain('радость');
  });

  test('normalizes the query and includes custom emotions', () => {
    expect(searchEmotions('  ОБИ ', [{ name: 'обида', family: null }])).toEqual(['обида']);
  });

  test('empty query returns nothing', () => {
    expect(searchEmotions('', [])).toEqual([]);
    expect(searchEmotions('   ', [])).toEqual([]);
  });
});

describe('familyNeighbors', () => {
  test('familyNeighbors(fear) has trust and surprise around it', () => {
    const n = familyNeighbors('fear');
    expect(n.prev).toBe('trust');
    expect(n.next).toBe('surprise');
    expect(n.dyads.map((d) => d.name)).toEqual(['покорность', 'трепет']);
  });

  test('familyNeighbors wraps around the wheel', () => {
    const n = familyNeighbors('joy');
    expect(n.prev).toBe('anticipation');
    expect(n.next).toBe('trust');
    expect(n.dyads.map((d) => d.name)).toEqual(['оптимизм', 'любовь']);
  });
});

describe('chipColors', () => {
  test('chipColors level 3 alpha 0.8', () => {
    expect(chipColors(lookupEmotion('ужас', []))).toEqual({
      background: 'rgba(201, 197, 52, 0.8)',
      border: '#C9C534',
    });
  });

  test('alpha follows level and dyad', () => {
    expect(chipColors(lookupEmotion('тревога', [])).background).toBe('rgba(201, 197, 52, 0.25)');
    expect(chipColors(lookupEmotion('страх', [])).background).toBe('rgba(201, 197, 52, 0.5)');
    expect(chipColors(lookupEmotion('трепет', [])).background).toBe('rgba(201, 197, 52, 0.4)');
  });

  test('custom emotion with family uses dyad alpha', () => {
    const info = lookupEmotion('обида', [{ name: 'обида', family: 'sadness' }]);
    expect(chipColors(info)).toEqual({
      background: 'rgba(159, 203, 229, 0.4)',
      border: '#9FCBE5',
    });
  });

  test('unknown emotion is neutral', () => {
    expect(chipColors(lookupEmotion('нечто', []))).toEqual({
      background: '#EEF3F6',
      border: '#9AA5AF',
    });
  });
});
