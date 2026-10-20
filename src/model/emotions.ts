import type { CustomEmotion, EmotionFamily } from './types';

export interface FamilyDef {
  id: EmotionFamily;
  label: string;
  color: string;
  /** Weak, base and strong emotion names. */
  levels: [string, string, string];
}

export interface DyadDef {
  name: string;
  /** Two adjacent families; the first is the earlier one clockwise. */
  families: [EmotionFamily, EmotionFamily];
}

export interface EmotionInfo {
  name: string;
  family: EmotionFamily | null;
  level: 1 | 2 | 3 | null;
  dyad: boolean;
  color: string;
}

const NEUTRAL_COLOR = '#9AA5AF';
const NEUTRAL_BACKGROUND = '#EEF3F6';
const LEVEL_ALPHA = { 1: 0.25, 2: 0.5, 3: 0.8 } as const;
const BLEND_ALPHA = 0.4;

/** Plutchik's wheel, clockwise from the top petal. */
export const FAMILIES: FamilyDef[] = [
  { id: 'joy', label: 'радость', color: '#C94C8A', levels: ['безмятежность', 'радость', 'восторг'] },
  { id: 'trust', label: 'доверие', color: '#F2D63B', levels: ['принятие', 'доверие', 'восхищение'] },
  { id: 'fear', label: 'страх', color: '#C9C534', levels: ['тревога', 'страх', 'ужас'] },
  {
    id: 'surprise',
    label: 'удивление',
    color: '#4CB7C9',
    levels: ['возбуждение', 'удивление', 'изумление'],
  },
  { id: 'sadness', label: 'грусть', color: '#9FCBE5', levels: ['печаль', 'грусть', 'горе'] },
  {
    id: 'disgust',
    label: 'отвращение',
    color: '#7B8FD0',
    levels: ['скука', 'брезгливость', 'отвращение'],
  },
  { id: 'anger', label: 'гнев', color: '#E8A33A', levels: ['досада', 'злость', 'гнев'] },
  {
    id: 'anticipation',
    label: 'ожидание',
    color: '#E39ACB',
    levels: ['интерес', 'ожидание', 'настороженность'],
  },
];

const DYAD_NAMES = [
  'любовь',
  'покорность',
  'трепет',
  'разочарование',
  'раскаяние',
  'презрение',
  'агрессия',
  'оптимизм',
];

/** Blends of adjacent families: DYADS[i] sits between FAMILIES[i] and FAMILIES[i + 1]. */
export const DYADS: DyadDef[] = DYAD_NAMES.map((name, i) => ({
  name,
  families: [FAMILIES[i].id, FAMILIES[(i + 1) % FAMILIES.length].id],
}));

function familyDef(id: EmotionFamily): FamilyDef {
  const def = FAMILIES.find((f) => f.id === id);
  if (!def) throw new Error(`Unknown emotion family: ${id}`);
  return def;
}

export function normalizeEmotionName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function lookupEmotion(name: string, custom: CustomEmotion[]): EmotionInfo {
  const normalized = normalizeEmotionName(name);

  for (const family of FAMILIES) {
    const index = family.levels.indexOf(normalized);
    if (index !== -1) {
      return {
        name: normalized,
        family: family.id,
        level: (index + 1) as 1 | 2 | 3,
        dyad: false,
        color: family.color,
      };
    }
  }

  const dyad = DYADS.find((d) => d.name === normalized);
  if (dyad) {
    const family = dyad.families[0];
    return { name: normalized, family, level: null, dyad: true, color: familyDef(family).color };
  }

  const own = custom.find((c) => normalizeEmotionName(c.name) === normalized);
  const family = own?.family ?? null;
  return {
    name: normalized,
    family,
    level: null,
    dyad: false,
    color: family ? familyDef(family).color : NEUTRAL_COLOR,
  };
}

export function allEmotionNames(custom: CustomEmotion[]): string[] {
  const names = [
    ...FAMILIES.flatMap((f) => f.levels),
    ...DYADS.map((d) => d.name),
    ...custom.map((c) => normalizeEmotionName(c.name)),
  ];
  return [...new Set(names)];
}

export function searchEmotions(query: string, custom: CustomEmotion[]): string[] {
  const needle = normalizeEmotionName(query);
  if (needle === '') return [];
  return allEmotionNames(custom).filter((name) => name.includes(needle));
}

export function familyNeighbors(id: EmotionFamily): {
  prev: EmotionFamily;
  next: EmotionFamily;
  dyads: [DyadDef, DyadDef];
} {
  const count = FAMILIES.length;
  const i = FAMILIES.findIndex((f) => f.id === id);
  const prevIndex = (i - 1 + count) % count;
  return {
    prev: FAMILIES[prevIndex].id,
    next: FAMILIES[(i + 1) % count].id,
    dyads: [DYADS[prevIndex], DYADS[i]],
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function chipColors(info: EmotionInfo): { background: string; border: string } {
  if (info.family === null) {
    return { background: NEUTRAL_BACKGROUND, border: NEUTRAL_COLOR };
  }
  const alpha = info.level === null ? BLEND_ALPHA : LEVEL_ALPHA[info.level];
  return { background: hexToRgba(info.color, alpha), border: info.color };
}
