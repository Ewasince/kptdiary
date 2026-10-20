import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { IntensityControl } from '../components/IntensityControl';

function setup(value: number | null, min: 0 | 1 = 0, unit: '' | '%' = '%') {
  const onChange = vi.fn();
  render(
    <IntensityControl label="Уверенность" value={value} min={min} unit={unit} onChange={onChange} />,
  );
  return {
    onChange,
    range: screen.getByRole('slider', { name: 'Уверенность' }),
    number: screen.getByRole('spinbutton', { name: 'Значение: Уверенность' }),
  };
}

describe('IntensityControl', () => {
  test('renders label and value', () => {
    const { range, number } = setup(67);
    expect(screen.getByText('Уверенность')).toBeInTheDocument();
    expect(number).toHaveValue(67);
    expect(range).toHaveValue('67');
    expect(screen.getByText('%')).toBeInTheDocument();
    const labels = screen.getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['−10', '−5', '−1', '+1', '+5', '+10']);
  });

  test('plus five snaps to next multiple', async () => {
    const { onChange } = setup(67);
    await userEvent.click(screen.getByRole('button', { name: '+5' }));
    expect(onChange).toHaveBeenCalledWith(70);
  });

  test('minus five snaps to previous multiple', async () => {
    const { onChange } = setup(67);
    await userEvent.click(screen.getByRole('button', { name: '−5' }));
    expect(onChange).toHaveBeenCalledWith(65);
  });

  test('typing a number clamps to range', async () => {
    const { onChange, number } = setup(null, 0);
    await userEvent.type(number, '150');
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(100);
  });

  test('typing a number commits on enter', async () => {
    const { onChange, number } = setup(20, 1);
    await userEvent.clear(number);
    await userEvent.type(number, '0{enter}');
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('ignores non numeric input', async () => {
    const { onChange, number } = setup(40);
    await userEvent.clear(number);
    await userEvent.type(number, 'abc');
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
    expect(number).toHaveValue(40);
  });

  test('range change calls onChange', () => {
    const { onChange, range } = setup(10);
    fireEvent.change(range, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  test('null value steps from 50', async () => {
    const { onChange, range, number } = setup(null, 1, '');
    expect(number).toHaveValue(null);
    expect(range).toHaveValue('50');
    expect(screen.queryByText('%')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+1' }));
    expect(onChange).toHaveBeenCalledWith(51);
  });

  test('layout prop picks the class', () => {
    const { container } = render(
      <IntensityControl label="x" value={1} min={1} unit="" onChange={() => {}} layout="row" />,
    );
    expect(container.firstElementChild).toHaveClass('intensity', 'intensity--row');
  });
});
