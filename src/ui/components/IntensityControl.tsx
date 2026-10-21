import { useState, type KeyboardEvent } from 'react';
import {
  NULL_START,
  clampIntensity,
  stepIntensity,
  type IntensityStep,
} from '../../model/intensity';
import { useIsDesktop } from '../useMediaQuery';

const MAX = 100;
const STEPS: IntensityStep[] = [-10, -5, -1, 1, 5, 10];

export interface IntensityControlProps {
  label: string;
  value: number | null;
  min: 0 | 1;
  unit: '' | '%';
  onChange(value: number): void;
  layout?: 'stack' | 'row';
}

/** Minus sign U+2212, not a hyphen (spec §5.3). */
function stepLabel(step: IntensityStep): string {
  return step < 0 ? `−${-step}` : `+${step}`;
}

export function IntensityControl({
  label,
  value,
  min,
  unit,
  onChange,
  layout,
}: IntensityControlProps) {
  const isDesktop = useIsDesktop();
  const mode = layout ?? (isDesktop ? 'row' : 'stack');
  // While the number field is being edited it holds the raw text, so clamping
  // does not fight the user mid-typing. Text that is a whole number in range is
  // committed at once, so leaving the screen without blurring keeps it; empty or
  // out-of-range text is committed (clamped) on blur or Enter.
  // The draft remembers the value it was typed over: once the value changes from
  // anywhere else (slider, step button, parent), the draft is stale and dropped.
  const [draft, setDraft] = useState<{ text: string; base: number | null } | null>(null);
  const text = draft !== null && draft.base === value ? draft.text : null;

  function change(next: number) {
    setDraft(null);
    onChange(next);
  }

  function commit() {
    setDraft(null);
    if (text === null || text.trim() === '') return;
    const n = Number(text);
    if (Number.isNaN(n)) return;
    const next = clampIntensity(n, min, MAX);
    if (next !== value) onChange(next);
  }

  function onType(nextText: string) {
    const n = Number(nextText);
    if (nextText.trim() !== '' && Number.isInteger(n) && n >= min && n <= MAX) {
      // Based on the new value, so the parent's update does not make it stale.
      setDraft({ text: nextText, base: n });
      onChange(n);
    } else {
      setDraft({ text: nextText, base: value });
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  }

  const number = (
    <span className="intensity-value">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={MAX}
        step={1}
        aria-label={`Значение: ${label}`}
        value={text ?? value ?? ''}
        onChange={(e) => onType(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
      {unit && <span className="intensity-unit">{unit}</span>}
    </span>
  );

  const controls = (
    <div className="intensity-controls">
      <input
        type="range"
        min={min}
        max={MAX}
        step={1}
        aria-label={label}
        value={value ?? NULL_START}
        onChange={(e) => change(Number(e.target.value))}
      />
      <div className="intensity-steps" role="group" aria-label={label}>
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            className={step < 0 ? 'step-minus' : 'step-plus'}
            onClick={() => change(stepIntensity(value, step, min, MAX))}
          >
            {stepLabel(step)}
          </button>
        ))}
      </div>
    </div>
  );

  // DOM order follows the visual order of each layout, so Tab moves as the eye does.
  return (
    <div className={`intensity intensity--${mode}`}>
      <span className="intensity-label">{label}</span>
      {mode === 'row' ? (
        <>
          {controls}
          {number}
        </>
      ) : (
        <>
          {number}
          {controls}
        </>
      )}
    </div>
  );
}
