# КПТ-дневник Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the offline-first PWA diary for the CBT "dysfunctional thoughts protocol" described in the spec: entries with emotions, thoughts and ratings, a Plutchik-wheel emotion picker, JSON backup with merge, and an HTML/PDF report for the therapist.

**Architecture:** Vite + React + TypeScript single-page app with four layers: `model` (pure functions, no React), `storage` (localStorage + files), `report` (HTML string generator), `ui` (React screens over a hash router). One `Diary` JSON document in localStorage is the only state; every form change updates it.

**Tech Stack:** Vite 5, React 18, TypeScript 5, vite-plugin-pwa, Vitest, @testing-library/react, @testing-library/user-event, jsdom, ESLint (typescript-eslint + react-hooks), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-20-kptdiary-design.md` (read it first; this plan cites its section numbers as §N).

## Global Constraints

- UI copy in Russian exactly as the spec writes it; code, identifiers, comments, commit messages in English.
- No CSS frameworks, no Google Fonts; system font stack. CSS variables from §9: `--accent: #2F6B8C`, `--text: #1F2328`, `--muted: #5B6670`, `--border: #D9DEE3`, `--panel: #F4F6F8`, `--warn-text: #8A5A00`, `--warn-bg: #FFF4DB`, `--ok-text: #1E6B3A`, `--ok-bg: #E4F3E9`, `--neutral: #9AA5AF`.
- Breakpoint 900 px: below = phone layout, at or above = desktop layout (§5).
- Touch targets at least 44 px tall on phone layout.
- Base path `/kptdiary/` by default, overridable by `VITE_BASE` (§7).
- `model` imports nothing from `storage`, `report`, `ui`, or React. `report` imports only `model`.
- IDs via `crypto.randomUUID()`; all datetimes ISO 8601 strings from `new Date().toISOString()`.
- `npm run check` = `tsc --noEmit && eslint . && vitest run` and must pass before every commit.
- Commit message format: `type: summary` (feat, test, chore, fix, docs). Append the session attribution lines given to the coordinator.

## Review Focus

1. Emotion names typed with different case or trailing spaces ("Тревога ", "ТРЕВОГА") must resolve to the catalog entry, never create a duplicate custom emotion. → Task 3 test `normalizes name case and whitespace`.
2. `createdAt` edited to a future or far-past date must still group and sort correctly in the list and fall into the right report period (dates are compared by local calendar day, not UTC). → Task 4 test `uses local calendar days`, Task 8 test `groups by local day`.
3. Importing a backup that contains the same entry with an older `updatedAt` must not revert a local edit; the summary must count it as neither new nor updated. → Task 5 test `keeps local when incoming is older`.
4. A thought left completely empty (no text) must not make a complete-looking entry incomplete forever; emptiness of `text` is the thing to check first and the "not filled" hint must appear. → Task 2 test `empty thought text makes entry incomplete`, Task 11 test `shows hint for unfinished thought`.
5. User text containing `<`, `>`, `&`, `"` in situation or thoughts must render literally in the report, not as markup. → Task 7 test `escapes user text`.

---

## File structure

```
package.json, vite.config.ts, tsconfig.json, tsconfig.node.json, eslint.config.js, index.html
public/icon.svg, public/favicon.svg
src/main.tsx                      — mounts App, registers SW
src/vite-env.d.ts
src/model/types.ts                — Diary, Entry, Thought, EmotionRating, CustomEmotion, EmotionFamily
src/model/entry.ts                — createEntry, createThought, isComplete, isEmptyEntry, touch
src/model/intensity.ts            — stepIntensity, clampIntensity
src/model/emotions.ts             — FAMILIES, DYADS, lookupEmotion, searchEmotions, normalizeEmotionName, familyNeighbors, chipColors
src/model/recent.ts               — recentEmotions
src/model/period.ts               — Period, presetPeriod, entriesInPeriod, localDayKey
src/model/merge.ts                — mergeDiaries, mergeSummary
src/model/migrate.ts              — SCHEMA_VERSION, emptyDiary, migrate, ImportError
src/storage/diaryStore.ts         — loadDiary, saveDiary (debounced), StorageError, LAST_BACKUP_KEY helpers
src/storage/files.ts              — downloadText, readTextFile
src/storage/persist.ts            — requestPersistentStorage
src/report/render.ts              — renderReport
src/report/styles.ts              — REPORT_CSS
src/ui/App.tsx, router.ts, useDiary.tsx, format.ts, useMediaQuery.ts
src/ui/screens/EntryList.tsx, EntryEditor.tsx, ExportScreen.tsx
src/ui/components/Layout.tsx, IntensityControl.tsx, EmotionChip.tsx, EmotionPicker.tsx,
  EmotionFlower.tsx, EmotionList.tsx, ThoughtCard.tsx, EmotionSection.tsx, UpdateToast.tsx
src/ui/styles.css
src/**/__tests__/*.test.ts(x)     — tests next to the layer they test
.github/workflows/deploy.yml
scripts/screenshots.mjs           — Playwright screenshots of built app (manual check)
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`, `src/ui/App.tsx`, `src/ui/styles.css`, `src/test-setup.ts`, `.gitignore`
- Delete: `pyproject.toml`
- Test: `src/ui/__tests__/App.test.tsx`

**Interfaces:**
- Produces: `App` default export rendering `<h1>КПТ-дневник</h1>` placeholder; `npm run check`, `npm test`, `npm run build` all work; `styles.css` defines the CSS variables from Global Constraints on `:root`.

- [ ] **Step 1: Scaffold with Vite**

Run: `npm create vite@latest . -- --template react-ts` is interactive; instead write `package.json` by hand with these dependencies: `react@^18.3`, `react-dom@^18.3`; dev: `vite@^5.4`, `@vitejs/plugin-react@^4.3`, `typescript@^5.6`, `vitest@^2.1`, `jsdom@^25`, `@testing-library/react@^16`, `@testing-library/user-event@^14`, `@testing-library/jest-dom@^6`, `eslint@^9`, `typescript-eslint@^8`, `eslint-plugin-react-hooks@^5`, `@types/react@^18`, `@types/react-dom@^18`, `vite-plugin-pwa@^0.20`. Scripts: `dev`, `build: tsc --noEmit && vite build`, `preview`, `test: vitest run`, `test:watch: vitest`, `lint: eslint .`, `typecheck: tsc --noEmit`, `check: npm run typecheck && npm run lint && npm run test`. Then `npm install`.

- [ ] **Step 2: Write config files**

`vite.config.ts`: `base: process.env.VITE_BASE ?? '/kptdiary/'`, react plugin, `test: { environment: 'jsdom', setupFiles: ['src/test-setup.ts'], globals: false }`. PWA plugin is added in Task 13, not here. `tsconfig.json`: strict, `jsx: react-jsx`, `moduleResolution: bundler`, `types: ["vite/client"]`, include `src`. `eslint.config.js`: typescript-eslint recommended + react-hooks. `.gitignore`: `node_modules`, `dist`, `.idea`, `dev-dist`. `src/test-setup.ts`: `import '@testing-library/jest-dom/vitest'`. `index.html`: `lang="ru"`, `<title>КПТ-дневник</title>`, viewport meta, `theme-color #2F6B8C`, root div, module script `/src/main.tsx`.

- [ ] **Step 3: Write the failing smoke test**

```tsx
// src/ui/__tests__/App.test.tsx
import { render, screen } from '@testing-library/react';
import App from '../App';
test('renders app title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'КПТ-дневник' })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run test, expect failure** — `npx vitest run src/ui/__tests__/App.test.tsx` → FAIL (module not found).

- [ ] **Step 5: Implement `App.tsx` placeholder and `styles.css` with `:root` variables, `body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--text); background: #fff }`.** `main.tsx` renders `<App />` into `#root` with `StrictMode` and imports `./ui/styles.css`.

- [ ] **Step 6: Run `npm run check` and `npm run build`** → all pass, `dist/` created.

- [ ] **Step 7: Delete `pyproject.toml`, commit** — `chore: scaffold Vite React TypeScript project`.

---

### Task 2: Model types, entry factory, completeness, intensity stepping

**Files:**
- Create: `src/model/types.ts`, `src/model/entry.ts`, `src/model/intensity.ts`
- Test: `src/model/__tests__/entry.test.ts`, `src/model/__tests__/intensity.test.ts`

**Interfaces:**
- Produces (`types.ts`): exactly the interfaces from spec §3 plus `type EmotionFamily = 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness' | 'disgust' | 'anger' | 'anticipation'`.
- Produces (`entry.ts`): `createEntry(now: string): Entry` (empty strings/arrays, `deletedAt: null`, `createdAt = updatedAt = now`); `createThought(): Thought` (all null/empty); `isComplete(entry: Entry): boolean` (§3 rule); `isEmptyEntry(entry: Entry): boolean` (situation trimmed empty, no emotions, no thoughts, no outcome emotions); `touch(entry: Entry, now: string): Entry` (returns copy with `updatedAt = now`); `replaceEntry(diary: Diary, entry: Entry): Diary` (replaces by id, appends if missing); `removeEntry(diary: Diary, id: string): Diary` (physical removal).
- Produces (`intensity.ts`): `clampIntensity(value: number, min: number, max?: number): number` (rounds, default max 100); `stepIntensity(value: number | null, step: -10 | -5 | -1 | 1 | 5 | 10, min: number, max?: number): number` (§5.3 rule; `null` treated as 50).

- [ ] **Step 1: Write failing tests**

`entry.test.ts`: `createEntry sets timestamps and empty fields`; `isComplete true for fully filled entry`; `isComplete false when outcomeEmotions empty`; `isComplete false when a thought beliefAfter is null`; `empty thought text makes entry incomplete`; `isEmptyEntry true for fresh entry and false once situation has text`.

`intensity.test.ts` table test over `[value, step, expected]`: `[67, 5, 70]`, `[67, -5, 65]`, `[70, 5, 75]`, `[70, -5, 65]`, `[67, 10, 70]`, `[63, -10, 60]`, `[60, -10, 50]`, `[99, 1, 100]`, `[100, 5, 100]`, `[1, -5, 1]` with min 1, `[3, -5, 0]` with min 0, `[null, 5, 55]`, `[null, -1, 49]`; plus `clampIntensity(150, 0) === 100`, `clampIntensity(-3, 1) === 1`, `clampIntensity(49.6, 0) === 50`.

- [ ] **Step 2: Run tests, expect failure.**
- [ ] **Step 3: Implement the three files.** Stepping: for |step| = 1 add; for positive step `(Math.floor(v / s) + 1) * s`; for negative `(Math.ceil(v / s) - 1) * s`; then clamp.
- [ ] **Step 4: Run tests, expect pass. Run `npm run check`.**
- [ ] **Step 5: Commit** — `feat: add diary model types, entry helpers and intensity stepping`.

---

### Task 3: Emotion catalog

**Files:**
- Create: `src/model/emotions.ts`, `src/model/recent.ts`
- Test: `src/model/__tests__/emotions.test.ts`, `src/model/__tests__/recent.test.ts`

**Interfaces:**
- Produces (`emotions.ts`):
  - `interface FamilyDef { id: EmotionFamily; label: string; color: string; levels: [string, string, string] }` and `const FAMILIES: FamilyDef[]` in the clockwise order of spec §4 (joy first), labels and level names exactly from the §4 table.
  - `interface DyadDef { name: string; families: [EmotionFamily, EmotionFamily] }` and `const DYADS: DyadDef[]` in order любовь, покорность, трепет, разочарование, раскаяние, презрение, агрессия, оптимизм; `families` are the two adjacent families (first = the earlier one clockwise, e.g. любовь: `['joy','trust']`, оптимизм: `['anticipation','joy']`).
  - `interface EmotionInfo { name: string; family: EmotionFamily | null; level: 1 | 2 | 3 | null; dyad: boolean; color: string }`.
  - `normalizeEmotionName(raw: string): string` → trimmed, lowercase, internal whitespace collapsed.
  - `lookupEmotion(name: string, custom: CustomEmotion[]): EmotionInfo` (unknown name → family null, color `#9AA5AF`).
  - `allEmotionNames(custom: CustomEmotion[]): string[]` (catalog levels, then dyads, then custom; no duplicates).
  - `searchEmotions(query: string, custom: CustomEmotion[]): string[]` substring match on normalized query; empty query → `[]`.
  - `familyNeighbors(id: EmotionFamily): { prev: EmotionFamily; next: EmotionFamily; dyads: [DyadDef, DyadDef] }` (dyad with prev, dyad with next).
  - `chipColors(info: EmotionInfo): { background: string; border: string }` → background is `color` with alpha 0.25/0.5/0.8 by level, 0.4 for dyads, `#EEF3F6` for unknown; border is `color` or `#9AA5AF`. Return CSS `rgba()` strings (write a small `hexToRgba(hex, alpha)` helper in the same file).
- Produces (`recent.ts`): `recentEmotions(entries: Entry[], now: string, limit = 8): string[]` — names counted over `emotions` and `outcomeEmotions` of non-deleted entries with `createdAt` within the last 30 days; sort by count desc, then by latest `createdAt` desc.

- [ ] **Step 1: Write failing tests**

`emotions.test.ts`: `FAMILIES has 8 entries in spec order` (first `joy`, third `fear` with levels `['тревога','страх','ужас']`); `lookupEmotion('ужас') is fear level 3`; `normalizes name case and whitespace` (`lookupEmotion(' Тревога  ', [])` is fear level 1); `lookupEmotion('покорность') is dyad of trust and fear` (`family === 'trust'`, `dyad === true`); `custom emotion with family gets family color`; `unknown name has null family and neutral color`; `searchEmotions('тре', [])` contains `'тревога'` and `'трепет'`; `familyNeighbors('fear')` → prev `trust`, next `surprise`, dyads `покорность`, `трепет`; `familyNeighbors('joy').prev === 'anticipation'`; `chipColors level 3 alpha 0.8`.

`recent.test.ts`: `counts emotions across both lists within 30 days`; `ignores deleted and older entries`; `ties broken by latest use`; `respects limit`.

- [ ] **Step 2: Run, expect failure. Step 3: Implement. Step 4: Run, pass; `npm run check`.**
- [ ] **Step 5: Commit** — `feat: add Plutchik emotion catalog and recent-emotions helper`.

---

### Task 4: Report periods

**Files:**
- Create: `src/model/period.ts`
- Test: `src/model/__tests__/period.test.ts`

**Interfaces:**
- Produces: `type PeriodPreset = 'day' | 'week' | 'month' | 'all' | 'sinceExport'`; `interface Period { from: string; to: string }` where both are local calendar dates `YYYY-MM-DD` (inclusive); `localDayKey(iso: string): string` (`YYYY-MM-DD` in local time); `presetPeriod(preset: PeriodPreset, ctx: { now: string; entries: Entry[]; lastReportExportAt: string | null }): Period | null` (§5.5 definitions; `all` with no entries → from = to = today; `sinceExport` with null → `null`); `entriesInPeriod(entries: Entry[], period: Period): Entry[]` (non-deleted, `localDayKey(createdAt)` between from and to inclusive, sorted by `createdAt` ascending); `periodLabel(period: Period): string` → `"20 сентября — 20 октября 2026"` (same day → `"20 октября 2026"`; same year omitted on the first date).

- [ ] **Step 1: Write failing tests** — `day preset is today`; `week preset spans 7 days including today`; `month preset spans 30 days`; `all preset starts at earliest entry`; `sinceExport uses lastReportExportAt day`; `sinceExport without export is null`; `uses local calendar days` (an entry at `23:30` local on day X is in period `[X, X]` even if UTC differs: construct the ISO with `new Date(y, m, d, 23, 30).toISOString()`); `entriesInPeriod excludes deleted and sorts ascending`; `periodLabel formats ranges`.
- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.** Month names in genitive: январь→«января» … (array of 12 strings).
- [ ] **Step 5: Commit** — `feat: add report period presets and filtering`.

---

### Task 5: Merge and migrate

**Files:**
- Create: `src/model/merge.ts`, `src/model/migrate.ts`
- Test: `src/model/__tests__/merge.test.ts`, `src/model/__tests__/migrate.test.ts`

**Interfaces:**
- Produces (`migrate.ts`): `const SCHEMA_VERSION = 1`; `emptyDiary(): Diary`; `class ImportError extends Error { constructor(message: string) }` with messages `'Файл не похож на бэкап дневника'` and `'Файл из более новой версии приложения'`; `migrate(raw: unknown): Diary` (validates shape: object with numeric `schemaVersion` and array `entries`; throws `ImportError`; version above current → newer-version error; fills missing optional fields `customEmotions: []`, `lastReportExportAt: null`, `deletedAt: null`, `outcomeEmotions: []`; strips unknown top-level keys such as `exportedAt`).
- Produces (`merge.ts`): `mergeDiaries(local: Diary, incoming: Diary): Diary` (§6 rules); `interface MergeSummary { added: number; updated: number; customEmotions: number }`; `mergeSummary(local: Diary, incoming: Diary): MergeSummary` (added = ids only in incoming; updated = ids in both where incoming `updatedAt` is strictly later; customEmotions = names only in incoming).

- [ ] **Step 1: Write failing tests**

`merge.test.ts`: `adds entries missing locally`; `takes newer updatedAt`; `keeps local when incoming is older`; `keeps local on equal updatedAt`; `newer deletion wins over older edit`; `newer edit revives older deletion`; `unions custom emotions preferring local family`; `takes later lastReportExportAt`; `summary counts added updated and custom`.

`migrate.test.ts`: `rejects non-object`; `rejects newer schema`; `fills missing fields and drops exportedAt`; `returns valid diary unchanged`.

- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.**
- [ ] **Step 5: Commit** — `feat: add diary merge and migration`.

---

### Task 6: Storage layer and diary hook

**Files:**
- Create: `src/storage/diaryStore.ts`, `src/storage/files.ts`, `src/storage/persist.ts`, `src/ui/useDiary.tsx`
- Test: `src/storage/__tests__/diaryStore.test.ts`, `src/ui/__tests__/useDiary.test.tsx`

**Interfaces:**
- Produces (`diaryStore.ts`): `const DIARY_KEY = 'kptdiary.diary'`, `const LAST_BACKUP_KEY = 'kptdiary.lastBackupAt'`; `type LoadResult = { diary: Diary; corrupted: false } | { diary: Diary; corrupted: true }` (corrupted → `emptyDiary()` and the bad value is left untouched); `loadDiary(storage: Storage = localStorage): LoadResult`; `saveDiaryNow(diary: Diary, storage?: Storage): void` throws `StorageError('quota')` on `QuotaExceededError`; `createDebouncedSaver(delayMs = 300, storage?: Storage): { save(diary: Diary): void; flush(): void }` (last call wins; `flush` writes immediately and is called on `beforeunload` by the hook); `class StorageError extends Error { kind: 'quota' | 'unknown' }`; `getLastBackupAt(storage?)`, `setLastBackupAt(iso, storage?)`.
- Produces (`files.ts`): `downloadText(filename: string, text: string, mime: string): void` (Blob + anchor click + revoke); `readTextFile(file: File): Promise<string>`.
- Produces (`persist.ts`): `requestPersistentStorage(): Promise<boolean>` (false when API missing).
- Produces (`useDiary.tsx`): `DiaryProvider({ children })` and `useDiary(): { diary: Diary; corrupted: boolean; saveError: StorageError | null; update(fn: (d: Diary) => Diary): void; replace(diary: Diary): void; now(): string }`. `update` applies `fn`, sets state, schedules debounced save; on save failure sets `saveError` but keeps state. `replace` saves immediately. Provider calls `requestPersistentStorage()` once on mount (result logged with `console.info`).

- [ ] **Step 1: Write failing tests**

`diaryStore.test.ts` (jsdom `localStorage`): `loads empty diary when key missing`; `round-trips a diary`; `reports corrupted JSON and leaves value untouched`; `debounced saver writes once after delay` (use `vi.useFakeTimers()`); `flush writes immediately`; `throws StorageError quota when setItem throws QuotaExceededError` (stub `setItem` to throw `new DOMException('full', 'QuotaExceededError')`).

`useDiary.test.tsx`: `update changes diary and persists after debounce`; `replace persists immediately`.

- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.**
- [ ] **Step 5: Commit** — `feat: add localStorage diary store, file helpers and diary hook`.

---

### Task 7: Report renderer

**Files:**
- Create: `src/report/render.ts`, `src/report/styles.ts`
- Test: `src/report/__tests__/render.test.ts`

**Interfaces:**
- Consumes: `isComplete`, `lookupEmotion`, `chipColors`, `periodLabel`, `Period`.
- Produces: `renderReport(input: { entries: Entry[]; period: Period; customEmotions: CustomEmotion[]; generatedAt: string }): string` — full HTML document per §5.6, `<html lang="ru">`, `<title>Протокол дисфункциональных мыслей</title>`, `<style>${REPORT_CSS}</style>` inline, no external URLs; `escapeHtml(text: string): string` exported for tests. Date formatting helper `formatDateTime(iso): string` → `"19 октября, 22:15"` (reuse month array by moving it to `src/model/period.ts` export `MONTHS_GENITIVE`).
- `REPORT_CSS` includes `@page { size: A4; margin: 16mm }`, `.entry { break-inside: avoid }`, `* { print-color-adjust: exact; -webkit-print-color-adjust: exact }`, layout mirroring the A4 mockup (header with period and counts, entry cards, thoughts table with three columns, emotions before/after row, footer).

- [ ] **Step 1: Write failing tests** — `includes period label and counts` (2 entries, 1 complete → contains `"2"` next to «записей» and `"1"` next to «завершены»); `renders situation emotions and thought rows`; `marks unfinished entries` (contains «Не завершена» once); `renders before-after pairs` (contains `"80"` and `"30"` for вина in the same `.pair` element); `escapes user text` (situation `<script>alert(1)</script>` → output contains `&lt;script&gt;` and not `<script>alert`); `has no external resources` (no `http://`/`https://` in output).
- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.**
- [ ] **Step 5: Commit** — `feat: render therapist report as standalone HTML`.

---

### Task 8: Router, layout, entry list screen

**Files:**
- Create: `src/ui/router.ts`, `src/ui/useMediaQuery.ts`, `src/ui/format.ts`, `src/ui/components/Layout.tsx`, `src/ui/components/EmotionChip.tsx`, `src/ui/screens/EntryList.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/styles.css`
- Test: `src/ui/__tests__/router.test.ts`, `src/ui/__tests__/EntryList.test.tsx`

**Interfaces:**
- Produces (`router.ts`): `type Route = { name: 'list' } | { name: 'entry'; id: string } | { name: 'export' }`; `parseHash(hash: string): Route` (`''`, `'#'`, `'#/'` → list; `'#/entry/abc'` → entry; `'#/export'` → export; anything else → list); `navigate(route: Route): void` sets `location.hash`; `useRoute(): Route` (subscribes to `hashchange`).
- Produces (`useMediaQuery.ts`): `useIsDesktop(): boolean` for `(min-width: 900px)` (false in jsdom).
- Produces (`format.ts`): `formatTime(iso): "18:40"`, `formatDayHeading(iso, now): "Сегодня, 20 октября" | "Вчера, 19 октября" | "17 октября"` (year appended when different from now).
- Produces (`EmotionChip.tsx`): `EmotionChip({ name, intensity?, custom, variant?: 'default' | 'after', onRemove? })` — colored by `chipColors(lookupEmotion(name, custom))`; label `"{name} {intensity}"`; `onRemove` renders an `×` button with `aria-label="Убрать: {name}"`.
- Produces (`Layout.tsx`): `Layout({ route, children })` — phone: bottom nav «Записи» / «Экспорт» with `aria-current="page"`; desktop: top bar with app name, nav links and «Новая запись» button; chooses by `useIsDesktop()`. Shows a `role="alert"` banner «Не удалось прочитать сохранённые данные. Импортируйте бэкап на экране «Экспорт».» when `useDiary().corrupted`, and «Не удалось сохранить, место закончилось. Сделайте бэкап.» when `saveError?.kind === 'quota'`.
- Produces (`EntryList.tsx`): screen per §5.1; `onNew` creates `createEntry(now())` via `update`, navigates to it. Export `groupEntriesByDay(entries: Entry[], now: string): { heading: string; entries: Entry[] }[]` for tests. Before/after pairs: `pairEmotions(entry): { name; before; after }[]` plus leftovers rendered as plain chips.
- `App.tsx`: wraps in `DiaryProvider`, reads `useRoute()`, renders `EntryList` for list; placeholders for entry/export until Tasks 11–12.

- [ ] **Step 1: Write failing tests** — `router.test.ts`: `parseHash` cases above. `EntryList.test.tsx`: `shows corrupted banner` (seed localStorage with `{bad json` → alert text present); `shows empty state with button` («Записей пока нет», button «Новая запись»); `groups by local day` (entries today 23:30 local and yesterday → headings «Сегодня, …» and «Вчера, …», newest first); `shows unfinished badge only for incomplete entries` (one complete, one incomplete → exactly one «Не завершена»); `renders before-after pair in one row` (text «Вина 80» and «Вина 30» inside the same element with class `pair`); `new entry button adds entry and navigates` (after click, `location.hash` matches `#/entry/` and diary has one entry).
- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.** CSS: cards, day headings, badge, phone bottom nav (fixed, 44 px targets), desktop header and 1040 px container, grid rows `72px minmax(0,1fr) 360px` on desktop with `.pair { white-space: nowrap }`.
- [ ] **Step 5: Commit** — `feat: add hash router, layout and entry list screen`.

---

### Task 9: IntensityControl component

**Files:**
- Create: `src/ui/components/IntensityControl.tsx`
- Modify: `src/ui/styles.css`
- Test: `src/ui/__tests__/IntensityControl.test.tsx`

**Interfaces:**
- Consumes: `stepIntensity`, `clampIntensity`.
- Produces: `IntensityControl({ label: string; value: number | null; min: 0 | 1; unit: '' | '%'; onChange(value: number): void; layout?: 'stack' | 'row' })` — default layout from `useIsDesktop()` (`row` on desktop). Markup: `<label>` text, `input[type=range]` with `aria-label=label`, `input[type=number]` with `aria-label="Значение: {label}"`, six `<button type="button">` labelled `−10 −5 −1 +1 +5 +10` (minus sign U+2212), classes `step-minus` / `step-plus`. Empty value shows the number field empty and the range at 50.

- [ ] **Step 1: Write failing tests** — `renders label and value`; `plus five snaps to next multiple` (value 67, click «+5» → `onChange(70)`); `minus five snaps to previous multiple` (67, «−5» → 65); `typing a number clamps to range` (type 150 with min 0 → `onChange(100)`); `ignores non numeric input` (type `abc` → `onChange` not called); `range change calls onChange` (fireEvent.change range to 42 → 42); `null value steps from 50` («+1» → 51).
- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.** CSS: stack layout (label+number row, range, 6-column grid of buttons ≥ 36 px tall), row layout (grid `150px minmax(0,1fr) auto`, buttons centred under the range, max-width 420 px), `accent-color: var(--accent)` on range, red/green button text.
- [ ] **Step 5: Commit** — `feat: add intensity control with slider, number input and step buttons`.

---

### Task 10: Emotion picker (flower, list, search, custom)

**Files:**
- Create: `src/ui/components/EmotionFlower.tsx`, `src/ui/components/EmotionList.tsx`, `src/ui/components/EmotionPicker.tsx`
- Modify: `src/ui/styles.css`
- Test: `src/ui/__tests__/EmotionFlower.test.tsx`, `src/ui/__tests__/EmotionPicker.test.tsx`

**Interfaces:**
- Consumes: `FAMILIES`, `DYADS`, `familyNeighbors`, `searchEmotions`, `normalizeEmotionName`, `lookupEmotion`, `chipColors`, `recentEmotions`, `EmotionChip`.
- Produces (`EmotionFlower.tsx`): `EmotionFlower({ selectedFamily: EmotionFamily | null; selectedNames: string[]; onSelectFamily(id: EmotionFamily): void; onToggleDyad(name: string): void; size?: number })` — SVG generated from `FAMILIES`/`DYADS` with the §5.4 geometry (viewBox 440×440, centre 220, petal ellipse rx 38 ry 78 at distance 78, labels at radius 90 and 161, dashed circle radius 180). Petal groups: `role="button"`, `tabIndex=0`, `aria-label={family label}`, `aria-pressed` when selected, Enter/Space triggers. Non-selected petals `fill-opacity 0.32` when a family is selected, else their normal opacity. Dyad `<text>` elements likewise clickable with `role="button"`; dark (`#1F2328`) when adjacent to the selected family, grey otherwise. Export `petalTransform(index): string` and `labelPosition(angleDeg, radius): { x; y }` for tests.
- Produces (`EmotionList.tsx`): `EmotionList({ selectedNames; recent: string[]; custom: CustomEmotion[]; onToggle(name) })` — groups «Недавние», each family label with its three levels and the dyad with the next family, «Свои»; chips are `<button aria-pressed>`.
- Produces (`EmotionPicker.tsx`): `EmotionPicker({ open: boolean; selectedNames: string[]; recent: string[]; custom: CustomEmotion[]; onToggle(name: string): void; onAddCustom(name: string, family: EmotionFamily | null): void; onClose(): void })` — renders nothing when closed; phone: bottom sheet (`role="dialog"`, `aria-label="Выбор эмоции"`), desktop: centred modal; header «Эмоции», view toggle «Цветок» / «Список» (`aria-pressed`), search input `placeholder="Найти или добавить свою…"`, button «Готово» → `onClose`. Search non-empty: shows matching chips; if no exact normalized match, shows button `Добавить „{query}“` and a row of eight family buttons plus «Без семьи»; clicking family button or «Без семьи» calls `onAddCustom(normalized, family)` and `onToggle(normalized)`, clears the search. Flower view: flower + family section (dot, label, three level chips in order, divider, two dyad chips dashed) using `familyNeighbors`; on desktop also «Выбрано в этой записи» (chips with remove) and «Недавние». Escape key closes.

- [ ] **Step 1: Write failing tests**

`EmotionFlower.test.tsx`: `renders eight petals and eight dyad labels` (8 buttons named by family labels, texts for all dyads); `clicking petal calls onSelectFamily('fear')`; `dyad label click toggles name` («покорность»); `labelPosition(90, 90)` ≈ `{ x: 310, y: 220 }`; `keyboard Enter on petal selects`.

`EmotionPicker.test.tsx`: `renders nothing when closed`; `selecting petal shows its three levels in order` (click «страх» → buttons «тревога», «страх», «ужас» in that order, plus «покорность», «трепет»); `toggling level chip calls onToggle('тревога')`; `search filters and adds custom` (type «выгор» → button «Добавить „выгор“» → click «Без семьи» → `onAddCustom('выгор', null)` and `onToggle('выгор')`); `search finds catalog emotion by substring` (type «тре» → chips «тревога», «трепет»); `list view shows families and recent`; `done closes`; `recent chips shown first in list view`.

- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.** CSS: sheet (`position: fixed; inset: auto 0 0 0; height: 90vh; border-radius: 20px 20px 0 0`), backdrop, modal 980 px, view toggle, flower sizing 100 % of width up to 440 px on phone, 540 px on desktop in a two-column grid.
- [ ] **Step 5: Commit** — `feat: add emotion picker with Plutchik flower and list views`.

---

### Task 11: Entry editor screen

**Files:**
- Create: `src/ui/components/EmotionSection.tsx`, `src/ui/components/ThoughtCard.tsx`, `src/ui/screens/EntryEditor.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/styles.css`
- Test: `src/ui/__tests__/EntryEditor.test.tsx`

**Interfaces:**
- Consumes: `IntensityControl`, `EmotionPicker`, `EmotionChip`, `createThought`, `isComplete`, `isEmptyEntry`, `touch`, `recentEmotions`, `useDiary`, `navigate`.
- Produces (`EmotionSection.tsx`): `EmotionSection({ title: string; hint?: string; ratings: EmotionRating[]; custom; recent: string[]; onChange(ratings: EmotionRating[]): void; onAddCustom(name, family): void })` — selected chips with remove, button «+ Добавить эмоцию» opening `EmotionPicker`, one `IntensityControl` per rating (`min 1`, `unit ''`). Toggling on adds `{ name, intensity: null }`; toggling off removes.
- Produces (`ThoughtCard.tsx`): `ThoughtCard({ index: number; thought: Thought; onChange(t: Thought): void; onRemove(): void })` — textarea `aria-label="Автоматическая мысль"`, `IntensityControl` «Насколько убедительна» (`min 0`, `%`), divider, label «Рациональный ответ» + textarea, «Убедительность ответа», «Мысль убедительна сейчас»; hint «Ответ и переоценка ещё не заполнены» when `response` trimmed empty or `responseBelief`/`beliefAfter` null; remove button `aria-label="Удалить мысль"`. Desktop: two-column grid for thought/response, intensity rows full width.
- Produces (`EntryEditor.tsx`): `EntryEditor({ id: string })` — reads entry from `useDiary`; unknown id → text «Запись не найдена» with link to list. Header: back link `aria-label="Назад к списку"`, `datetime-local` input `aria-label="Когда"` bound to `createdAt` (local time conversion helpers `isoToLocalInput`, `localInputToIso` in `format.ts`), delete button `aria-label="Удалить запись"` → `window.confirm('Удалить запись?')` → sets `deletedAt` and `updatedAt`, navigates to list. Sections per §5.2 with headings «Ситуация», «Эмоции», «Автоматические мысли», «Результат»; «+ Ещё мысль»; footer button «Готово» + text «Изменения сохраняются автоматически». Every change: `update(d => replaceEntry(d, touch(changed, now())))`. On unmount (and on «Готово»): if `isEmptyEntry(entry)` remove it physically from `entries`. `onAddCustom` appends to `diary.customEmotions` if not present (by normalized name). Result section passes `recent` = names from the entry's own `emotions` first, then `recentEmotions`.
- `App.tsx`: route `entry` renders `EntryEditor`.

- [ ] **Step 1: Write failing tests** — `edits situation and persists` (type → diary entry situation updated, `updatedAt` changed); `adds emotion via picker and shows intensity control` (click «+ Добавить эмоцию», petal «страх», chip «тревога», «Готово» → chip «тревога» and an `IntensityControl` labelled «тревога»); `adds second thought` (click «+ Ещё мысль» → two «Автоматическая мысль» textareas); `shows hint for unfinished thought` (thought with text but no response → hint present; fill response and both beliefs → hint gone); `delete asks confirmation and soft-deletes` (`vi.spyOn(window, 'confirm').mockReturnValue(true)` → entry has `deletedAt`, hash is `#/`); `empty entry removed on done` (fresh entry, click «Готово» → `entries.length === 0`); `custom emotion added to diary` (via search → `customEmotions` contains it).
- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.**
- [ ] **Step 5: Commit** — `feat: add entry editor with emotions, thoughts and autosave`.

---

### Task 12: Export screen (report + backup + import)

**Files:**
- Create: `src/ui/screens/ExportScreen.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/styles.css`
- Test: `src/ui/__tests__/ExportScreen.test.tsx`

**Interfaces:**
- Consumes: `presetPeriod`, `entriesInPeriod`, `localDayKey`, `renderReport`, `mergeDiaries`, `mergeSummary`, `migrate`, `ImportError`, `downloadText`, `readTextFile`, `getLastBackupAt`, `setLastBackupAt`, `useDiary`.
- Produces: `ExportScreen()` per §5.5. Period chips `<button aria-pressed>` «День», «Неделя», «Месяц», «Всё время», «С последней выгрузки» (disabled with `title="Выгрузок ещё не было"` when `lastReportExportAt` null); date inputs `aria-label="С"` / `aria-label="По"` (`type=date`, state initialised from «Месяц»). Text `В период попадает N записей, из них M незавершённые` (pluralisation helper `plural(n, ['запись','записи','записей'])` in `format.ts`) and `Последняя выгрузка отчёта: {date} | ещё не было`. Buttons: «Открыть отчёт» → `window.open(blobUrl, '_blank')`; «Сохранить HTML» → `downloadText('kptdiary-report-YYYY-MM-DD.html', html, 'text/html')`; «Сохранить PDF» → open report window and call `print()` on load. All three then `update(d => ({...d, lastReportExportAt: now()}))`. Backup block: «Скачать JSON» → `downloadText('kptdiary-YYYY-MM-DD.json', JSON.stringify({...diary, exportedAt: now()}, null, 2), 'application/json')` then `setLastBackupAt`; «Импортировать» → hidden `input[type=file][accept=.json,application/json]` with `aria-label="Файл бэкапа"`; after reading: `migrate` (errors shown in `role="alert"`), summary text `Новых записей: N, обновлённых: M, своих эмоций: K` and button «Применить» → `replace(mergeDiaries(diary, incoming))`, then «Импорт применён». Line `Последний бэкап: {date}, N дней назад | ещё не было`. Export helpers `buildReportHtml(diary, period, now)` and `reportFilename(now)` for tests.
- `App.tsx`: route `export` renders `ExportScreen`.

- [ ] **Step 1: Write failing tests** — `preset week fills dates` (click «Неделя» → «С» value is today minus 6 days in `YYYY-MM-DD`); `since export disabled without export`; `counts entries in period`; `save html downloads and stamps export time` (mock `downloadText` via `vi.mock('../../storage/files')` → called with filename matching `/^kptdiary-report-\d{4}-\d{2}-\d{2}\.html$/`; diary `lastReportExportAt` not null); `import shows summary then applies` (upload a `File` with a diary JSON containing one new entry → text «Новых записей: 1» → click «Применить» → diary has the entry); `import rejects newer schema` (alert contains «более новой версии»); `backup download sets last backup`.
- [ ] **Steps 2–4: fail, implement, pass, `npm run check`.**
- [ ] **Step 5: Commit** — `feat: add export screen with report, backup and import`.

---

### Task 13: PWA, update toast, deploy workflow, README

**Files:**
- Create: `public/icon.svg`, `public/favicon.svg`, `src/ui/components/UpdateToast.tsx`, `.github/workflows/deploy.yml`, `README.md`
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/ui/App.tsx`, `package.json`
- Test: `src/ui/__tests__/UpdateToast.test.tsx`

**Interfaces:**
- `vite.config.ts`: `VitePWA({ registerType: 'prompt', includeAssets: ['favicon.svg', 'icon.svg'], manifest: { name: 'КПТ-дневник', short_name: 'Дневник', lang: 'ru', display: 'standalone', orientation: 'portrait', theme_color: '#2F6B8C', background_color: '#FFFFFF', start_url: '.', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] } })`. Add `pwa-assets-generator` is not used; generate `public/icon-192.png` and `public/icon-512.png` from `icon.svg` with a one-off script using Playwright (`scripts/make-icons.mjs`, commits the PNGs).
- `UpdateToast({ needRefresh: boolean; onUpdate(): void })` renders «Доступно обновление» and button «Обновить» when `needRefresh`. `main.tsx` uses `registerSW({ onNeedRefresh })` from `virtual:pwa-register` and passes state into `App` via a tiny store (`src/ui/swState.ts` with `useSyncExternalStore`). Add `vite-plugin-pwa/client` to `tsconfig` types.
- `deploy.yml`: on push to `master`; `actions/checkout@v4`, `actions/setup-node@v4` (node 20, cache npm), `npm ci`, `npm run check`, `npm run build`, `actions/upload-pages-artifact@v3` with `dist`, `actions/deploy-pages@v4`; permissions `pages: write`, `id-token: write`.
- `README.md` (Russian): what it is, how to run (`npm install`, `npm run dev`), how to deploy (Pages + `VITE_BASE`), how to install as PWA on Android, backup/import and report workflow.

- [ ] **Step 1: Write failing test** — `UpdateToast shows button and calls onUpdate`.
- [ ] **Steps 2–4: implement, pass, `npm run check`, `npm run build`** → `dist/manifest.webmanifest` and `dist/sw.js` exist; `npx vite preview` serves `/kptdiary/` (curl 200).
- [ ] **Step 5: Commit** — `feat: add PWA manifest, service worker update toast and Pages deploy`.

---

### Task 14: Visual verification against mockups

**Files:**
- Create: `scripts/screenshots.mjs`
- Test: manual review of screenshots

- [ ] **Step 1: Write `scripts/screenshots.mjs`** — builds nothing; expects `npx vite preview --port 4173` running; Playwright (`executablePath: '/opt/pw-browsers/chromium'`) seeds `localStorage` with a fixture diary (two entries like the mockups) via `page.addInitScript`, then screenshots `#/`, `#/entry/<id>` (with picker open, flower view), `#/export` at 390×844 and 1280×900, plus the generated report HTML at 794×1123, into a directory passed as argv.
- [ ] **Step 2: Run it**, open each PNG, compare with the mockups: list grouping and badge, intensity control layout, flower (no label overlaps), export presets, report layout. Fix CSS deviations, re-run `npm run check`.
- [ ] **Step 3: Commit** — `chore: add screenshot script for visual checks`.
