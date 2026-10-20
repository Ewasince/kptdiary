import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createEntry, createThought } from '../../model/entry';
import { emptyDiary } from '../../model/migrate';
import type { Diary, Entry } from '../../model/types';
import { DIARY_KEY } from '../../storage/diaryStore';
import App from '../App';

const local = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

const NOW = local(2026, 10, 20, 12);
const CREATED = local(2026, 10, 19, 18, 40);

function seed(entry: Entry) {
  localStorage.setItem(DIARY_KEY, JSON.stringify({ ...emptyDiary(), entries: [entry] }));
  window.location.hash = `#/entry/${entry.id}`;
}

function stored(): Diary {
  return JSON.parse(localStorage.getItem(DIARY_KEY) ?? 'null') as Diary;
}

function section(name: string): HTMLElement {
  return screen.getByRole('region', { name });
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

test('edits situation and persists', async () => {
  const entry = { ...createEntry(CREATED), situation: 'Опоздал' };
  seed(entry);
  render(<App />);
  const situation = screen.getByRole('textbox', { name: 'Ситуация' });
  expect(situation).toHaveValue('Опоздал');
  await userEvent.type(situation, ' на поезд');
  await waitFor(() => expect(stored().entries[0].situation).toBe('Опоздал на поезд'));
  expect(stored().entries[0].updatedAt).toBe(NOW);
});

test('edits date and time', async () => {
  seed({ ...createEntry(CREATED), situation: 'Опоздал' });
  render(<App />);
  const when = screen.getByLabelText('Когда');
  expect(when).toHaveValue('2026-10-19T18:40');
  fireEvent.change(when, { target: { value: '2026-10-18T09:15' } });
  expect(when).toHaveValue('2026-10-18T09:15');
  await waitFor(() => expect(stored().entries[0].createdAt).toBe(local(2026, 10, 18, 9, 15)));
});

test('adds emotion via picker and shows intensity control', async () => {
  seed({ ...createEntry(CREATED), situation: 'Ситуация' });
  render(<App />);
  await userEvent.click(
    within(section('Эмоции')).getByRole('button', { name: '+ Добавить эмоцию' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Выбор эмоции' });
  await userEvent.click(within(dialog).getByRole('button', { name: 'страх' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'тревога' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Готово' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const emotions = section('Эмоции');
  expect(within(emotions).getByRole('button', { name: 'Убрать: тревога' })).toBeInTheDocument();
  expect(within(emotions).getByRole('slider', { name: 'тревога' })).toBeInTheDocument();
  expect(within(section('Результат')).queryByRole('slider')).not.toBeInTheDocument();
  await waitFor(() =>
    expect(stored().entries[0].emotions).toEqual([{ name: 'тревога', intensity: null }]),
  );
});

test('adds second thought', async () => {
  seed({ ...createEntry(CREATED), thoughts: [{ ...createThought(), text: 'Я всё испортил' }] });
  render(<App />);
  const thoughts = section('Автоматические мысли');
  expect(within(thoughts).getAllByRole('textbox', { name: 'Автоматическая мысль' })).toHaveLength(
    1,
  );
  await userEvent.click(within(thoughts).getByRole('button', { name: '+ Ещё мысль' }));
  const textareas = within(thoughts).getAllByRole('textbox', { name: 'Автоматическая мысль' });
  expect(textareas).toHaveLength(2);
  expect(textareas[0]).toHaveValue('Я всё испортил');
  expect(within(thoughts).getByRole('heading', { name: 'Мысль 2' })).toBeInTheDocument();
  await waitFor(() => expect(stored().entries[0].thoughts).toHaveLength(2));
});

test('shows hint for unfinished thought', async () => {
  seed({
    ...createEntry(CREATED),
    thoughts: [{ ...createThought(), text: 'Я всё испортил', belief: 80 }],
  });
  render(<App />);
  const hint = 'Ответ и переоценка ещё не заполнены';
  expect(screen.getByText(hint)).toBeInTheDocument();
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Рациональный ответ' }),
    'Один промах не значит всё',
  );
  expect(screen.getByText(hint)).toBeInTheDocument();
  await userEvent.click(
    within(screen.getByRole('group', { name: 'Убедительность ответа' })).getByRole('button', {
      name: '+10',
    }),
  );
  expect(screen.getByText(hint)).toBeInTheDocument();
  await userEvent.click(
    within(screen.getByRole('group', { name: 'Мысль убедительна сейчас' })).getByRole('button', {
      name: '−10',
    }),
  );
  expect(screen.queryByText(hint)).not.toBeInTheDocument();
  await waitFor(() =>
    expect(stored().entries[0].thoughts[0]).toMatchObject({
      response: 'Один промах не значит всё',
      responseBelief: 60,
      beliefAfter: 40,
    }),
  );
});

test('delete asks confirmation and soft-deletes', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  const entry = { ...createEntry(CREATED), situation: 'Опоздал' };
  seed(entry);
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Удалить запись' }));
  expect(confirm).toHaveBeenCalledWith('Удалить запись?');
  expect(window.location.hash).toBe('#/');
  await waitFor(() => expect(stored().entries[0].deletedAt).toBe(NOW));
  expect(stored().entries).toHaveLength(1);
  expect(stored().entries[0].updatedAt).toBe(NOW);
});

test('deleting an empty entry removes it physically', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  seed(createEntry(NOW));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Удалить запись' }));
  expect(window.location.hash).toBe('#/');
  await waitFor(() => expect(stored().entries).toHaveLength(0));
});

test('empty entry removed on done', async () => {
  seed(createEntry(NOW));
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
  expect(window.location.hash).toBe('#/');
  await waitFor(() => expect(stored().entries).toHaveLength(0));
});

test('custom emotion added to diary', async () => {
  seed({ ...createEntry(CREATED), situation: 'Ситуация' });
  render(<App />);
  await userEvent.click(
    within(section('Эмоции')).getByRole('button', { name: '+ Добавить эмоцию' }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Выбор эмоции' });
  await userEvent.type(within(dialog).getByRole('searchbox'), 'выгор');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Без семьи' }));
  await waitFor(() => expect(stored().customEmotions).toEqual([{ name: 'выгор', family: null }]));
  expect(stored().entries[0].emotions).toEqual([{ name: 'выгор', intensity: null }]);
});

test('empty entry survives strict mode and is removed on leaving', async () => {
  seed(createEntry(NOW));
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Let StrictMode's simulated unmount settle before checking the entry is still there.
  await act(() => Promise.resolve());
  expect(screen.getByRole('heading', { name: 'Ситуация' })).toBeInTheDocument();
  expect(screen.queryByText('Запись не найдена')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: 'Назад к списку' }));
  expect(window.location.hash).toBe('#/');
  await waitFor(() => expect(stored().entries).toHaveLength(0));
});

test('unknown entry shows not found with link to list', () => {
  window.location.hash = '#/entry/missing';
  render(<App />);
  expect(screen.getByText('Запись не найдена')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'К списку' })).toHaveAttribute('href', '#/');
});

test('empty entry removed when another entry is opened', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  const empty = createEntry(NOW);
  seed(empty);
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: 'Новая запись' }));
  await waitFor(() => expect(stored().entries.map((e) => e.id)).not.toContain(empty.id));
  expect(stored().entries).toHaveLength(1);
  expect(window.location.hash).toBe(`#/entry/${stored().entries[0].id}`);
});
