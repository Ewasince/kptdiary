import { expect, test } from 'vitest';
import { plural } from '../plural';

test('plural picks the Russian form', () => {
  const forms = ['запись', 'записи', 'записей'] as const;
  expect([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => plural(n, forms))).toEqual([
    'записей',
    'запись',
    'записи',
    'записи',
    'записей',
    'записей',
    'записей',
    'записей',
    'запись',
    'записи',
    'записей',
    'запись',
    'записей',
  ]);
});
