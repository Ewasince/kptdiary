import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DIARY_KEY } from '../../storage/diaryStore';
import { downloadText } from '../../storage/files';
import { ErrorBoundary } from '../ErrorBoundary';

vi.mock('../../storage/files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../storage/files')>()),
  downloadText: vi.fn(),
}));

function Boom(): never {
  throw new Error('boom');
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  vi.mocked(downloadText).mockClear();
  // React reports caught render errors through console.error as well.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('renders children when nothing throws', () => {
  render(
    <ErrorBoundary>
      <p>Всё хорошо</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText('Всё хорошо')).toBeInTheDocument();
});

test('a child that throws renders the fallback', () => {
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('heading', { name: 'Что-то пошло не так' })).toBeInTheDocument();
  expect(
    screen.getByText('Данные не потеряны. Скачайте их и сообщите об ошибке.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Перезагрузить' })).toBeInTheDocument();
  expect(consoleError).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ message: 'boom' }),
    expect.anything(),
  );
});

test('the fallback downloads the raw stored diary', async () => {
  localStorage.setItem(DIARY_KEY, '{"raw":true}');
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Скачать сохранённые данные' }));
  expect(downloadText).toHaveBeenCalledWith(
    'kptdiary-raw.json',
    '{"raw":true}',
    'application/json',
  );
});
