// Visual check: screenshots of every screen at phone and desktop widths plus the report.
// Run with: node scripts/screenshots.mjs <out-dir>
// Expects `npm run build && npx vite preview --port 4173` running. Playwright is not a
// project dependency: it is loaded through require so a globally installed copy works.
// The report is captured from the real app: «Открыть отчёт» opens a blob URL in a new
// tab, which Playwright receives as a popup page of the same context.
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node scripts/screenshots.mjs <out-dir>');
  process.exit(1);
}
const BASE = process.env.APP_URL ?? 'http://localhost:4173/kptdiary/';
const STORAGE_KEY = 'kptdiary.diary';
const UNFINISHED_ID = '0b8f2a52-5d0c-4f8e-9a51-3f7c1d2e9a01';

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 900 };
const REPORT = { width: 794, height: 1123 };
/** The mockups' day: «Сегодня, 20 октября». Timers keep running; only the clock is fixed. */
const NOW = new Date('2026-10-20T15:00:00+03:00');

/**
 * Runs in the page before the app: seeds the two entries from the mockups,
 * dated today 09:40 and yesterday 22:15 in the page's local time.
 */
function seedDiary({ key, unfinishedId }) {
  const at = (daysAgo, hours, minutes) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };
  const diary = {
    schemaVersion: 1,
    entries: [
      {
        id: unfinishedId,
        createdAt: at(0, 9, 40),
        updatedAt: at(0, 9, 55),
        deletedAt: null,
        situation: 'Начальник не ответил на сообщение, хотя был онлайн',
        emotions: [
          { name: 'тревога', intensity: 70 },
          { name: 'обида', intensity: 40 },
        ],
        thoughts: [
          {
            id: '6c1e7f0a-2b3d-4c5e-8f90-a1b2c3d4e5f6',
            text: 'Он недоволен моей работой',
            belief: 80,
            response: 'Он мог быть занят на встрече. Раньше он тоже отвечал позже, и всё было в порядке.',
            responseBelief: 60,
            beliefAfter: 40,
          },
          {
            id: '7d2f8a1b-3c4e-4d6f-9a01-b2c3d4e5f6a7',
            text: 'Меня скоро уволят',
            belief: 50,
            response: '',
            responseBelief: null,
            beliefAfter: null,
          },
        ],
        outcomeEmotions: [],
      },
      {
        id: '1c9a3b63-6e1d-4a9f-8b62-4a8d2e3f0b02',
        createdAt: at(1, 22, 15),
        updatedAt: at(1, 22, 40),
        deletedAt: null,
        situation: 'Забыл поздравить друга с днём рождения',
        emotions: [{ name: 'вина', intensity: 80 }],
        thoughts: [
          {
            id: '8e3a9b2c-4d5f-4e70-8b12-c3d4e5f6a7b8',
            text: 'Я плохой друг',
            belief: 70,
            response: 'Один пропуск не делает меня плохим другом. Я поздравлю его сегодня и извинюсь.',
            responseBelief: 75,
            beliefAfter: 25,
          },
        ],
        outcomeEmotions: [{ name: 'вина', intensity: 30 }],
      },
    ],
    customEmotions: [
      { name: 'обида', family: 'sadness' },
      { name: 'вина', family: null },
    ],
    lastReportExportAt: null,
  };
  localStorage.setItem(key, JSON.stringify(diary));
}

async function openPage(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    // The service worker would cache an old build between runs.
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(seedDiary, { key: STORAGE_KEY, unfinishedId: UNFINISHED_ID });
  return { context, page };
}

async function go(page, hash) {
  await page.goto(`${BASE}${hash}`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

async function shot(page, name, fullPage = false) {
  const path = resolve(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage });
  console.log(`wrote ${path}`);
}

async function captureDevice(browser, prefix, viewport) {
  const { context, page } = await openPage(browser, viewport);
  try {
    await go(page, '#/');
    await shot(page, `${prefix}-list`);

    await go(page, `#/entry/${UNFINISHED_ID}`);
    await shot(page, `${prefix}-entry`, true);

    await page.getByRole('button', { name: '+ Добавить эмоцию' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'страх', exact: true }).first().click();
    await shot(page, `${prefix}-picker`);
    await page.getByRole('dialog').getByRole('button', { name: 'Готово' }).click();

    // The update toast only appears after a new deploy; inject its markup to check
    // that it clears the editor footer.
    await page.evaluate(() => {
      const toast = document.createElement('div');
      toast.className = 'update-toast';
      toast.innerHTML =
        '<span>Доступно обновление</span><button type="button" class="button-primary">Обновить</button>';
      document.body.append(toast);
    });
    await shot(page, `${prefix}-entry-toast`);
    await page.evaluate(() => document.querySelector('.update-toast')?.remove());

    await go(page, '#/export');
    await shot(page, `${prefix}-export`);
  } finally {
    await context.close();
  }
}

async function captureReport(browser) {
  const { context, page } = await openPage(browser, DESKTOP);
  try {
    await go(page, '#/export');
    await page.getByRole('button', { name: 'Всё время' }).click();
    const [report] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', { name: 'Открыть отчёт' }).click(),
    ]);
    await report.setViewportSize(REPORT);
    await report.waitForLoadState('load');
    await shot(report, 'report', true);
  } finally {
    await context.close();
  }
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
  // Date inputs format by the browser UI language, not the page locale.
  args: ['--lang=ru-RU'],
  env: { ...process.env, LANG: 'ru_RU.UTF-8', LANGUAGE: 'ru' },
});
try {
  await captureDevice(browser, 'phone', PHONE);
  await captureDevice(browser, 'desktop', DESKTOP);
  await captureReport(browser);
} finally {
  await browser.close();
}
