import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createEntry, createThought } from '../../model/entry';
import { emptyDiary } from '../../model/migrate';
import type { Entry } from '../../model/types';
import { DIARY_KEY } from '../../storage/diaryStore';
import App from '../App';
import { groupEntriesByDay } from '../screens/EntryList';

const local = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const NOW = local(2026, 10, 20, 12);

function entry(createdAt: string, fields: Partial<Entry> = {}): Entry {
  return { ...createEntry(createdAt), situation: 'Ситуация', ...fields };
}

function completeEntry(createdAt: string, fields: Partial<Entry> = {}): Entry {
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
    ...fields,
  });
}

function seed(entries: Entry[]) {
  localStorage.setItem(DIARY_KEY, JSON.stringify({ ...emptyDiary(), entries }));
}

function storedEntries(): Entry[] {
  const raw = localStorage.getItem(DIARY_KEY);
  return raw === null ? [] : (JSON.parse(raw).entries as Entry[]);
}

function stubDesktop() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('shows corrupted banner', () => {
  localStorage.setItem(DIARY_KEY, '{bad json');
  render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Не удалось прочитать сохранённые данные. Импортируйте бэкап на экране «Экспорт».',
  );
});

test('shows empty state with button', () => {
  render(<App />);
  expect(screen.getByText('Записей пока нет')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Новая запись' })).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('shows the phone heading with the current month and bottom nav', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Дневник' })).toBeInTheDocument();
  expect(screen.getByText('Октябрь 2026')).toBeInTheDocument();
  const nav = screen.getByRole('navigation');
  expect(within(nav).getByRole('link', { name: 'Записи' })).toHaveAttribute('aria-current', 'page');
  expect(within(nav).getByRole('link', { name: 'Экспорт' })).not.toHaveAttribute('aria-current');
});

test('groups by local day', () => {
  const yesterday = entry(local(2026, 10, 19, 10), { situation: 'Вчерашняя' });
  const morning = entry(local(2026, 10, 20, 9), { situation: 'Утренняя' });
  const late = entry(local(2026, 10, 20, 23, 30), { situation: 'Поздняя' });
  seed([yesterday, morning, late]);

  render(<App />);
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
    'Сегодня, 20 октября',
    'Вчера, 19 октября',
  ]);
  const situations = screen.getAllByText(/Вчерашняя|Утренняя|Поздняя/).map((el) => el.textContent);
  expect(situations).toEqual(['Поздняя', 'Утренняя', 'Вчерашняя']);
  expect(screen.getByText('23:30')).toBeInTheDocument();

  expect(groupEntriesByDay([yesterday, morning, late], NOW)).toEqual([
    { heading: 'Сегодня, 20 октября', entries: [late, morning] },
    { heading: 'Вчера, 19 октября', entries: [yesterday] },
  ]);
});

test('hides deleted entries', () => {
  seed([
    entry(local(2026, 10, 20, 9), { situation: 'Живая' }),
    entry(local(2026, 10, 20, 10), { situation: 'Удалённая', deletedAt: NOW }),
  ]);
  render(<App />);
  expect(screen.getByText('Живая')).toBeInTheDocument();
  expect(screen.queryByText('Удалённая')).not.toBeInTheDocument();
});

test('shows only the first line of the situation', () => {
  seed([entry(local(2026, 10, 20, 9), { situation: 'Первая строка\nвторая строка' })]);
  render(<App />);
  expect(screen.getByText('Первая строка')).toBeInTheDocument();
  expect(screen.queryByText(/вторая строка/)).not.toBeInTheDocument();
});

test('shows unfinished badge only for incomplete entries', () => {
  seed([
    completeEntry(local(2026, 10, 20, 9), { situation: 'Готовая' }),
    entry(local(2026, 10, 20, 10), { situation: 'Черновик' }),
  ]);
  render(<App />);
  expect(screen.getAllByText('Не завершена')).toHaveLength(1);
});

test('renders before-after pair in one row', () => {
  seed([
    completeEntry(local(2026, 10, 20, 9), {
      emotions: [{ name: 'Вина', intensity: 80 }],
      outcomeEmotions: [{ name: 'вина ', intensity: 30 }],
    }),
  ]);
  render(<App />);
  const pair = screen.getByText('Вина 80').closest('.pair');
  expect(pair).not.toBeNull();
  expect(pair).toContainElement(screen.getByText('вина 30'));
});

test('new entry button adds entry and navigates', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Новая запись' }));
  expect(await screen.findByRole('heading', { name: 'Ситуация' })).toBeInTheDocument();
  expect(window.location.hash).toMatch(/^#\/entry\//);
  await waitFor(() => expect(storedEntries()).toHaveLength(1));
  const [created] = storedEntries();
  expect(window.location.hash).toBe(`#/entry/${created.id}`);
  expect(created.createdAt).toBe(NOW);
});

describe('desktop', () => {
  beforeEach(stubDesktop);

  test('shows top bar and entry counts', () => {
    seed([
      completeEntry(local(2026, 10, 20, 9)),
      entry(local(2026, 10, 19, 9)),
      entry(local(2026, 10, 18, 9)),
    ]);
    render(<App />);
    expect(screen.getByText('КПТ-дневник')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Записи' })).toBeInTheDocument();
    expect(screen.getByText('3 записи, 2 не завершены')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Записи' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Новая запись' })).toBeInTheDocument();
  });
});
