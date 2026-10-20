import { expect, test } from 'vitest';
import { readTextFile } from '../files';

test('readTextFile returns the file contents', async () => {
  await expect(readTextFile(new File(['{"a":1}'], 'x.json'))).resolves.toBe('{"a":1}');
});
