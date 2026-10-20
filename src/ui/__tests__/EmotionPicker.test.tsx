import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { FAMILIES } from '../../model/emotions';
import type { CustomEmotion } from '../../model/types';
import { EmotionPicker } from '../components/EmotionPicker';

interface SetupOptions {
  open?: boolean;
  selectedNames?: string[];
  recent?: string[];
  custom?: CustomEmotion[];
}

function setup({ open = true, selectedNames = [], recent = [], custom = [] }: SetupOptions = {}) {
  const onToggle = vi.fn();
  const onAddCustom = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <EmotionPicker
      open={open}
      selectedNames={selectedNames}
      recent={recent}
      custom={custom}
      onToggle={onToggle}
      onAddCustom={onAddCustom}
      onClose={onClose}
    />,
  );
  return { ...view, onToggle, onAddCustom, onClose };
}

function buttonLabels(container: HTMLElement): (string | null)[] {
  return within(container)
    .getAllByRole('button')
    .map((b) => b.textContent);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EmotionPicker', () => {
  test('renders nothing when closed', () => {
    const { container } = setup({ open: false });
    expect(container).toBeEmptyDOMElement();
  });

  test('selecting petal shows its three levels in order', async () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Выбор эмоции' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Эмоции' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'страх' }));
    const section = screen.getByRole('region', { name: 'страх' });
    expect(buttonLabels(section)).toEqual(['тревога', 'страх', 'ужас', 'покорность', 'трепет']);
  });

  test('toggling level chip calls onToggle', async () => {
    const { onToggle } = setup({ selectedNames: ['ужас'] });
    await userEvent.click(screen.getByRole('button', { name: 'страх' }));
    const section = screen.getByRole('region', { name: 'страх' });
    const chip = within(section).getByRole('button', { name: 'тревога' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(within(section).getByRole('button', { name: 'ужас' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(chip);
    expect(onToggle).toHaveBeenCalledWith('тревога');
  });

  test('search filters and adds custom', async () => {
    const { onAddCustom, onToggle } = setup();
    const input = screen.getByPlaceholderText('Найти или добавить свою…');
    await userEvent.type(input, '  Выгор ');
    expect(screen.getByRole('button', { name: 'Добавить „выгор“' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'радость' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Без семьи' }));
    expect(onAddCustom).toHaveBeenCalledWith('выгор', null);
    expect(onToggle).toHaveBeenCalledWith('выгор');
    expect(input).toHaveValue('');
  });

  test('search finds catalog emotion by substring', async () => {
    const { onToggle } = setup({ custom: [{ name: 'тремор', family: 'fear' }] });
    await userEvent.type(screen.getByPlaceholderText('Найти или добавить свою…'), 'тре');
    expect(screen.getByRole('button', { name: 'тревога' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'трепет' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'тремор' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'любовь' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'трепет' }));
    expect(onToggle).toHaveBeenCalledWith('трепет');
  });

  test('list view shows families and recent', async () => {
    setup({ recent: ['досада'], custom: [{ name: 'выгорание', family: null }] });
    await userEvent.click(screen.getByRole('button', { name: 'Список' }));
    expect(screen.getByRole('button', { name: 'Список' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Цветок' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'Недавние' })).toBeInTheDocument();
    for (const family of FAMILIES) {
      expect(screen.getByRole('heading', { name: family.label })).toBeInTheDocument();
    }
    const fear = screen.getByRole('region', { name: 'страх' });
    expect(buttonLabels(fear)).toEqual(['тревога', 'страх', 'ужас', 'трепет']);
    const own = screen.getByRole('region', { name: 'Свои' });
    expect(buttonLabels(own)).toEqual(['выгорание']);
  });

  test('done closes', async () => {
    const { onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('recent chips shown first in list view', async () => {
    setup({ recent: ['злость', 'тревога'], selectedNames: ['тревога'] });
    await userEvent.click(screen.getByRole('button', { name: 'Список' }));
    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings[0]).toHaveTextContent('Недавние');
    const recent = screen.getByRole('region', { name: 'Недавние' });
    expect(buttonLabels(recent)).toEqual(['злость', 'тревога']);
    expect(within(recent).getByRole('button', { name: 'тревога' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('toggling a chip keeps focus on it when onClose is inline', async () => {
    function Harness() {
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <EmotionPicker
          open
          selectedNames={selected}
          recent={[]}
          custom={[]}
          onToggle={(name) =>
            setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]))
          }
          onAddCustom={() => {}}
          onClose={() => {}}
        />
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'страх' }));
    const section = screen.getByRole('region', { name: 'страх' });
    const chip = within(section).getByRole('button', { name: 'тревога' });
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveFocus();
  });

  test('selected chip uses the selected border, not the family colour', async () => {
    setup({ selectedNames: ['ужас', 'трепет'] });
    await userEvent.click(screen.getByRole('button', { name: 'страх' }));
    const section = screen.getByRole('region', { name: 'страх' });
    for (const name of ['ужас', 'трепет']) {
      const chip = within(section).getByRole('button', { name });
      expect(chip).toHaveClass('chip--selected');
      expect(chip.style.borderColor).toBe('');
    }
    const plain = within(section).getByRole('button', { name: 'тревога' });
    expect(plain).not.toHaveClass('chip--selected');
    expect(plain.style.borderColor).not.toBe('');
  });

  test('desktop shows selected chips with remove and recent', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { onToggle } = setup({ selectedNames: ['ужас'], recent: ['досада'] });
    expect(screen.getByRole('dialog')).toHaveClass('picker--modal');
    const selected = screen.getByRole('region', { name: 'Выбрано в этой записи' });
    await userEvent.click(within(selected).getByRole('button', { name: 'Убрать: ужас' }));
    expect(onToggle).toHaveBeenCalledWith('ужас');
    const recent = screen.getByRole('region', { name: 'Недавние' });
    await userEvent.click(within(recent).getByRole('button', { name: 'досада' }));
    expect(onToggle).toHaveBeenCalledWith('досада');
  });
});
