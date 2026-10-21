import { useMemo, useSyncExternalStore } from 'react';

export type Route = { name: 'list' } | { name: 'entry'; id: string } | { name: 'export' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path === '/export') return { name: 'export' };
  const entry = /^\/entry\/([^/]+)$/.exec(path);
  if (entry) return { name: 'entry', id: decodeURIComponent(entry[1]) };
  return { name: 'list' };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'list':
      return '#/';
    case 'entry':
      return `#/entry/${encodeURIComponent(route.id)}`;
    case 'export':
      return '#/export';
  }
}

export function navigate(route: Route): void {
  location.hash = routeHash(route);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getHash(): string {
  return location.hash;
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return useMemo(() => parseHash(hash), [hash]);
}
