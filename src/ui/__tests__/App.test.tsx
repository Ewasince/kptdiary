import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders app title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'КПТ-дневник' })).toBeInTheDocument();
});

test('cleans up the DOM between tests', () => {
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'КПТ-дневник' })).toHaveLength(1);
});
