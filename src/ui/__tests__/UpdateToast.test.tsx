import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateToast } from '../components/UpdateToast';

test('UpdateToast shows button and calls onUpdate', async () => {
  const onUpdate = vi.fn();
  render(<UpdateToast needRefresh onUpdate={onUpdate} />);
  expect(screen.getByText('Доступно обновление')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Обновить' }));
  expect(onUpdate).toHaveBeenCalledTimes(1);
});

test('UpdateToast renders nothing without a pending update', () => {
  const { container } = render(<UpdateToast needRefresh={false} onUpdate={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});
