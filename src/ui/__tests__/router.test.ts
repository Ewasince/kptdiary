import { describe, expect, test } from 'vitest';
import { parseHash } from '../router';

describe('parseHash', () => {
  test.each(['', '#', '#/'])('%j is the list', (hash) => {
    expect(parseHash(hash)).toEqual({ name: 'list' });
  });

  test('entry with id', () => {
    expect(parseHash('#/entry/abc')).toEqual({ name: 'entry', id: 'abc' });
  });

  test('export', () => {
    expect(parseHash('#/export')).toEqual({ name: 'export' });
  });

  test.each(['#/unknown', '#/entry/', '#/entry', '#/export/x', 'garbage'])(
    '%j falls back to the list',
    (hash) => {
      expect(parseHash(hash)).toEqual({ name: 'list' });
    },
  );
});
