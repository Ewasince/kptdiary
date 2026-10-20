import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createEntry, createThought } from '../../model/entry';
import { emptyDiary } from '../../model/migrate';
import type { Diary, Entry } from '../../model/types';
import { DIARY_KEY, LAST_BACKUP_KEY } from '../../storage/diaryStore';
import { downloadText } from '../../storage/files';
import App from '../App';
import { buildReportHtml, reportFilename } from '../screens/ExportScreen';

vi.mock('../../storage/files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../storage/files')>()),
  downloadText: vi.fn(),
}));

const local = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();

const NOW = local(2026, 10, 20, 12);

function entry(createdAt: string, fields: Partial<Entry> = {}): Entry {
  return { ...createEntry(createdAt), situation: 'Ситуация', ...fields };
}

function completeEntry(createdAt: string): Entry {
  return entry(createdAt, {
    emotions: [{ name: 'тревога', intensity: 70 }],
    thoughts: [
      {
        ...createThought(),
        text: 'Мысль',
        belief: 80,
        response: 'Ответ',
        responseBelief: 60,
        beliefAfter: 30,
      },
    ],
    outcomeEmotions: [{ name: 'тревога', intensity: 20 }],
  });
}

function seed(fields: Partial<Diary> = {}) {
  localStorage.setItem(DIARY_KEY, JSON.stringify({ ...emptyDiary(), ...fields }));
}

function stored(): Diary {
  return JSON.parse(localStorage.getItem(DIARY_KEY)!) as Diary;
}

function renderExport() {
  window.location.hash = '#/export';
  render(<App />);
}

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
  vi.spyOn(console, 'info').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:report');
  URL.revokeObjectURL = vi.fn();
  vi.mocked(downloadText).mockClear();
});

afterEach(() => {
  window.location.hash = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('preset week fills dates', async () => {
  renderExport();
  expect(button('Месяц')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByLabelText('С')).toHaveValue('2026-09-21');
  await userEvent.click(button('Неделя'));
  expect(screen.getByLabelText('С')).toHaveValue('2026-10-14');
  expect(screen.getByLabelText('По')).toHaveValue('2026-10-20');
  expect(button('Неделя')).toHaveAttribute('aria-pressed', 'true');
  expect(button('Месяц')).toHaveAttribute('aria-pressed', 'false');
});

test('since export disabled without export', () => {
  renderExport();
  const chip = button('С последней выгрузки');
  expect(chip).toBeDisabled();
  expect(chip).toHaveAttribute('title', 'Выгрузок ещё не было');
  expect(screen.getByText('Последняя выгрузка отчёта: ещё не было')).toBeInTheDocument();
});

test('since export uses the last export date', async () => {
  seed({ lastReportExportAt: local(2026, 10, 6) });
  renderExport();
  expect(screen.getByText('Последняя выгрузка отчёта: 6 октября')).toBeInTheDocument();
  await userEvent.click(button('С последней выгрузки'));
  expect(screen.getByLabelText('С')).toHaveValue('2026-10-06');
});

test('counts entries in period', async () => {
  seed({
    entries: [
      completeEntry(local(2026, 10, 20, 9)),
      entry(local(2026, 10, 15)),
      entry(local(2026, 9, 1)),
      { ...entry(local(2026, 10, 19)), deletedAt: local(2026, 10, 19, 13) },
    ],
  });
  renderExport();
  expect(screen.getByText('3 записи')).toBeInTheDocument();
  expect(
    screen.getByText('В период попадает 2 записи, из них 1 незавершённая'),
  ).toBeInTheDocument();
  await userEvent.click(button('День'));
  expect(
    screen.getByText('В период попадает 1 запись, из них 0 незавершённых'),
  ).toBeInTheDocument();
  await userEvent.click(button('Всё время'));
  expect(screen.getByLabelText('С')).toHaveValue('2026-09-01');
  expect(
    screen.getByText('В период попадает 3 записи, из них 2 незавершённые'),
  ).toBeInTheDocument();
});

test('manual date edit clears preset and inverted period disables report buttons', () => {
  renderExport();
  // user-event cannot type into date inputs in jsdom; change the value directly.
  fireEvent.change(screen.getByLabelText('С'), { target: { value: '2026-10-25' } });
  expect(button('Месяц')).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('Дата начала позже даты конца')).toBeInTheDocument();
  for (const name of ['Открыть отчёт', 'Сохранить HTML', 'Сохранить PDF']) {
    expect(button(name)).toBeDisabled();
  }
  fireEvent.change(screen.getByLabelText('С'), { target: { value: '' } });
  expect(screen.getByLabelText('С')).toHaveValue('2026-10-25');
  fireEvent.change(screen.getByLabelText('По'), { target: { value: '2026-10-31' } });
  expect(screen.queryByText('Дата начала позже даты конца')).not.toBeInTheDocument();
  expect(button('Открыть отчёт')).toBeEnabled();
});

test('save html downloads and stamps export time', async () => {
  seed({ entries: [completeEntry(local(2026, 10, 19))] });
  renderExport();
  await userEvent.click(button('Сохранить HTML'));
  expect(downloadText).toHaveBeenCalledTimes(1);
  const [filename, html, mime] = vi.mocked(downloadText).mock.calls[0];
  expect(filename).toMatch(/^kptdiary-report-\d{4}-\d{2}-\d{2}\.html$/);
  expect(html).toContain('Протокол дисфункциональных мыслей');
  expect(mime).toBe('text/html');
  expect(screen.getByText('Последняя выгрузка отчёта: 20 октября')).toBeInTheDocument();
  expect(button('С последней выгрузки')).toBeEnabled();
  await waitFor(() => expect(stored().lastReportExportAt).not.toBeNull());
});

test('open report opens the report in a new tab', async () => {
  const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
  renderExport();
  await userEvent.click(button('Открыть отчёт'));
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(open).toHaveBeenCalledWith('blob:report', '_blank');
  expect(screen.getByText('Последняя выгрузка отчёта: 20 октября')).toBeInTheDocument();
});

test('save pdf writes the report and prints it', async () => {
  const doc = { open: vi.fn(), write: vi.fn(), close: vi.fn() };
  const popup = { document: doc, print: vi.fn(), focus: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  renderExport();
  await userEvent.click(button('Сохранить PDF'));
  expect(doc.write).toHaveBeenCalledWith(expect.stringContaining('Протокол'));
  expect(doc.close).toHaveBeenCalled();
  await waitFor(() => expect(popup.print).toHaveBeenCalled());
  expect(screen.getByText('Последняя выгрузка отчёта: 20 октября')).toBeInTheDocument();
});

test('import shows summary then applies', async () => {
  const existing = completeEntry(local(2026, 10, 19));
  seed({ entries: [existing] });
  const incoming = entry(local(2026, 10, 18), { situation: 'Из бэкапа' });
  const backup = {
    ...emptyDiary(),
    entries: [existing, incoming],
    customEmotions: [{ name: 'тоска', family: 'sadness' }],
  };
  renderExport();
  await userEvent.upload(
    screen.getByLabelText('Файл бэкапа'),
    new File([JSON.stringify(backup)], 'b.json', { type: 'application/json' }),
  );
  expect(
    await screen.findByText('Новых записей: 1, обновлённых: 0, своих эмоций: 1'),
  ).toBeInTheDocument();
  await userEvent.click(button('Применить'));
  expect(screen.getByText('Импорт применён')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Применить' })).not.toBeInTheDocument();
  expect(stored().entries.map((e) => e.id)).toEqual([existing.id, incoming.id]);
  expect(stored().customEmotions).toEqual([{ name: 'тоска', family: 'sadness' }]);
});

test('import rejects newer schema', async () => {
  renderExport();
  await userEvent.upload(
    screen.getByLabelText('Файл бэкапа'),
    new File([JSON.stringify({ schemaVersion: 2, entries: [] })], 'b.json', {
      type: 'application/json',
    }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('более новой версии');
  expect(screen.queryByRole('button', { name: 'Применить' })).not.toBeInTheDocument();
});

test('import reports an unreadable file', async () => {
  renderExport();
  await userEvent.upload(
    screen.getByLabelText('Файл бэкапа'),
    new File(['{not json'], 'b.json', { type: 'application/json' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось прочитать файл');
});

test('backup download sets last backup', async () => {
  seed({ entries: [completeEntry(local(2026, 10, 19))] });
  localStorage.setItem(LAST_BACKUP_KEY, local(2026, 10, 15));
  renderExport();
  expect(screen.getByText('Последний бэкап: 15 октября, 5 дней назад')).toBeInTheDocument();
  await userEvent.click(button('Скачать JSON'));
  expect(downloadText).toHaveBeenCalledTimes(1);
  const [filename, json, mime] = vi.mocked(downloadText).mock.calls[0];
  expect(filename).toMatch(/^kptdiary-\d{4}-\d{2}-\d{2}\.json$/);
  expect(mime).toBe('application/json');
  const parsed = JSON.parse(json) as Diary & { exportedAt: string };
  expect(parsed.exportedAt).toBe(NOW);
  expect(parsed.entries).toHaveLength(1);
  expect(localStorage.getItem(LAST_BACKUP_KEY)).toBe(NOW);
  expect(screen.getByText('Последний бэкап: 20 октября, 0 дней назад')).toBeInTheDocument();
});

test('backup line says when there was none', () => {
  renderExport();
  expect(screen.getByText('Последний бэкап: ещё не было')).toBeInTheDocument();
});

test('helpers build the report and its filename', () => {
  const diary = { ...emptyDiary(), entries: [entry(local(2026, 10, 19), { situation: 'Внутри' })] };
  const html = buildReportHtml(diary, { from: '2026-10-19', to: '2026-10-20' }, NOW);
  expect(html).toContain('Внутри');
  expect(buildReportHtml(diary, { from: '2026-10-20', to: '2026-10-20' }, NOW)).not.toContain(
    'Внутри',
  );
  expect(reportFilename(NOW)).toBe('kptdiary-report-2026-10-20.html');
});
