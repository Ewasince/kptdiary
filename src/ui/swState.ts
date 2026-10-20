/**
 * Tiny external store bridging the service worker registration in main.tsx
 * and the update toast rendered by App.
 */
export interface SwState {
  needRefresh: boolean;
  update: () => void;
}

let state: SwState = { needRefresh: false, update: () => {} };
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): SwState {
  return state;
}

/** Marks a new version as waiting; `update` activates it and reloads the page. */
export function setNeedRefresh(update: () => void): void {
  state = { needRefresh: true, update };
  listeners.forEach((listener) => listener());
}
