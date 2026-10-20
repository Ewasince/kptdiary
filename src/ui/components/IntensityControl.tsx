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
  // does not fight the user mid-typing; the value is committed on blur or Enter.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    setDraft(null);
    if (draft.trim() === '') return;
    const n = Number(draft);
    if (Number.isNaN(n)) return;
    onChange(clampIntensity(n, min, MAX));
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
        value={draft ?? value ?? ''}
        onChange={(e) => setDraft(e.target.value)}
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
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="intensity-steps">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            className={step < 0 ? 'step-minus' : 'step-plus'}
            onClick={() => onChange(stepIntensity(value, step, min, MAX))}
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
