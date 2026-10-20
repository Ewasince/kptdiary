import { describe, test, expect } from 'vitest';
import { clampIntensity, stepIntensity } from '../intensity';

type Step = -10 | -5 | -1 | 1 | 5 | 10;

describe('stepIntensity', () => {
  const cases: [number | null, Step, number, number][] = [
    [67, 5, 1, 70],
    [67, -5, 1, 65],
    [70, 5, 1, 75],
    [70, -5, 1, 65],
    [67, 10, 1, 70],
    [63, -10, 1, 60],
    [60, -10, 1, 50],
    [99, 1, 1, 100],
    [100, 5, 1, 100],
    [1, -5, 1, 1],
    [3, -5, 0, 0],
    [null, 5, 1, 55],
    [null, -1, 1, 49],
  ];

  test.each(cases)('stepIntensity(%s, %s, min %s) === %s', (value, step, min, expected) => {
    expect(stepIntensity(value, step, min)).toBe(expected);
  });
});

describe('clampIntensity', () => {
  test('clamps above the default max of 100', () => {
    expect(clampIntensity(150, 0)).toBe(100);
  });

  test('clamps below min', () => {
    expect(clampIntensity(-3, 1)).toBe(1);
  });

  test('rounds before clamping', () => {
    expect(clampIntensity(49.6, 0)).toBe(50);
  });
});
