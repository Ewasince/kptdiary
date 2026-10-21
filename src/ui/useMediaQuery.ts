import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 900px)';

function mediaQuery(): MediaQueryList | null {
  // jsdom and very old browsers have no matchMedia.
  return typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery();
  if (query === null) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function isDesktop(): boolean {
  return mediaQuery()?.matches ?? false;
}

/** True from 900 px wide (spec §5); false where matchMedia is unavailable. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, isDesktop);
}
