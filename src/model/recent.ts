import { normalizeEmotionName } from './emotions';
import type { Entry } from './types';

const WINDOW_MS = 30 * 86400000;

interface Usage {
  count: number;
  lastUsed: number;
}

/** Most used emotion names over the last 30 days; ties go to the more recently used. */
export function recentEmotions(entries: Entry[], now: string, limit = 8): string[] {
  const nowMs = Date.parse(now);
  const usage = new Map<string, Usage>();

  for (const entry of entries) {
    if (entry.deletedAt !== null) continue;
    const createdMs = Date.parse(entry.createdAt);
    if (nowMs - createdMs > WINDOW_MS) continue;

    for (const rating of [...entry.emotions, ...entry.outcomeEmotions]) {
      const name = normalizeEmotionName(rating.name);
      const current = usage.get(name);
      if (current) {
        current.count += 1;
        current.lastUsed = Math.max(current.lastUsed, createdMs);
      } else {
        usage.set(name, { count: 1, lastUsed: createdMs });
      }
    }
  }

  return [...usage.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit)
    .map(([name]) => name);
}
