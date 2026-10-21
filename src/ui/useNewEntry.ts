import { useCallback } from 'react';
import { createEntry } from '../model/entry';
import { navigate } from './router';
import { useDiary } from './useDiary';

/** Returns a handler that adds an entry dated now and opens it (spec §5.1). */
export function useNewEntry(): () => void {
  const { update, now } = useDiary();
  return useCallback(() => {
    const entry = createEntry(now());
    update((d) => ({ ...d, entries: [...d.entries, entry] }));
    navigate({ name: 'entry', id: entry.id });
  }, [update, now]);
}
