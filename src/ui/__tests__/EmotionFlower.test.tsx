import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DYADS, FAMILIES } from '../../model/emotions';
import type { EmotionFamily } from '../../model/types';
import { EmotionFlower, labelPosition, petalTransform } from '../components/EmotionFlower';

function flower(
  selectedFamily: EmotionFamily | null,
  selectedNames: string[],
  onSelectFamily: (id: EmotionFamily) => void,
  onToggleDyad: (name: string) => void,
) {
  return (
    <EmotionFlower
      selectedFamily={selectedFamily}
      selectedNames={selectedNames}
      onSelectFamily={onSelectFamily}
      onToggleDyad={onToggleDyad}
    />
  );
}

function setup(selectedFamily: EmotionFamily | null = null, selectedNames: string[] = []) {
  const onSelectFamily = vi.fn();
  const onToggleDyad = vi.fn();
  const view = render(flower(selectedFamily, selectedNames, onSelectFamily, onToggleDyad));
  return { onSelectFamily, onToggleDyad, rerender: view.rerender, container: view.container };
}

describe('EmotionFlower', () => {
  test('renders eight petals and eight dyad labels', () => {
    setup('fear', ['трепет']);
    for (const family of FAMILIES) {
      expect(screen.getByRole('button', { name: family.label })).toBeInTheDocument();
    }
    for (const dyad of DYADS) {
      expect(screen.getByRole('button', { name: dyad.name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(16);
    expect(screen.getByRole('button', { name: 'страх' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'радость' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'трепет' })).toHaveAttribute('aria-pressed', 'true');
    expect(petalTransform(3)).toBe('rotate(135 220 220)');
  });

  test('clicking petal calls onSelectFamily', async () => {
    const { onSelectFamily } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'страх' }));
    expect(onSelectFamily).toHaveBeenCalledWith('fear');
  });

  test('dyad label click toggles name', async () => {
    const { onToggleDyad, onSelectFamily } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'покорность' }));
    expect(onToggleDyad).toHaveBeenCalledWith('покорность');
    expect(onSelectFamily).not.toHaveBeenCalled();
  });

  test('labelPosition puts angle 90 to the right of centre', () => {
    const pos = labelPosition(90, 90);
    expect(pos.x).toBeCloseTo(310);
    expect(pos.y).toBeCloseTo(220);
    const up = labelPosition(0, 161);
    expect(up.x).toBeCloseTo(220);
    expect(up.y).toBeCloseTo(59);
  });

  test('keyboard Enter on petal selects', () => {
    const { onSelectFamily, onToggleDyad, rerender, container } = setup();
    const petal = screen.getByRole('button', { name: 'гнев' });
    petal.focus();
    fireEvent.keyDown(petal, { key: 'Enter' });
    expect(onSelectFamily).toHaveBeenCalledWith('anger');
    // The selected petal is drawn last (on top) and keeps keyboard focus.
    rerender(flower('anger', [], onSelectFamily, onToggleDyad));
    const petals = container.querySelectorAll('.flower-petal');
    expect(petals[petals.length - 1]).toHaveAttribute('aria-label', 'гнев');
    expect(petal).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('button', { name: 'любовь' }), { key: ' ' });
    expect(onToggleDyad).toHaveBeenCalledWith('любовь');
  });
});
