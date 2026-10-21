import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

test('renders the list screen empty state', () => {
  render(<App />);
  expect(screen.getByText('Записей пока нет')).toBeInTheDocument();
});

test('cleans up the DOM between tests', () => {
  render(<App />);
  expect(screen.getAllByText('Записей пока нет')).toHaveLength(1);
});
