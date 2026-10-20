import { normalizeEmotionName } from './emotions';
import type { CustomEmotion, Diary, Entry } from './types';

export interface MergeSummary {
  added: number;
  updated: number;
  customEmotions: number;
}

/** Incoming wins only when strictly newer; ties keep local. */
function isNewer(incoming: Entry, local: Entry): boolean {
  return incoming.updatedAt > local.updatedAt;
}

function laterOf(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return b > a ? b : a;
}

function mergeCustomEmotions(local: CustomEmotion[], incoming: CustomEmotion[]): CustomEmotion[] {
  const seen = new Set(local.map((c) => normalizeEmotionName(c.name)));
  const result = [...local];
  for (const c of incoming) {
    const key = normalizeEmotionName(c.name);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }
  return result;
}

/**
 * Merges an imported diary into the local one (spec §6). Entries match by id
 * and the later `updatedAt` wins, so soft deletion follows the same rule.
 * Result order: local entries first, then entries only present in incoming.
 */
export function mergeDiaries(local: Diary, incoming: Diary): Diary {
  const incomingById = new Map(incoming.entries.map((e) => [e.id, e]));
  const localIds = new Set(local.entries.map((e) => e.id));
  const entries = local.entries.map((l) => {
    const i = incomingById.get(l.id);
    return i && isNewer(i, l) ? i : l;
  });
  for (const i of incoming.entries) {
    if (!localIds.has(i.id)) entries.push(i);
  }
  return {
    schemaVersion: local.schemaVersion,
    entries,
    customEmotions: mergeCustomEmotions(local.customEmotions, incoming.customEmotions),
    lastReportExportAt: laterOf(local.lastReportExportAt, incoming.lastReportExportAt),
  };
}

/** Counts what applying `mergeDiaries(local, incoming)` would change. */
export function mergeSummary(local: Diary, incoming: Diary): MergeSummary {
  const localById = new Map(local.entries.map((e) => [e.id, e]));
  let added = 0;
  let updated = 0;
  for (const i of incoming.entries) {
    const l = localById.get(i.id);
    if (!l) added++;
    else if (isNewer(i, l)) updated++;
  }
  const localNames = new Set(local.customEmotions.map((c) => normalizeEmotionName(c.name)));
  const incomingNames = new Set(incoming.customEmotions.map((c) => normalizeEmotionName(c.name)));
  let customEmotions = 0;
  for (const name of incomingNames) {
    if (!localNames.has(name)) customEmotions++;
  }
  return { added, updated, customEmotions };
}
