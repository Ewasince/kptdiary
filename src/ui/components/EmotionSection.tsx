import { useCallback, useId, useState } from 'react';
import type { CustomEmotion, EmotionFamily, EmotionRating } from '../../model/types';
import { EmotionChip } from './EmotionChip';
import { EmotionPicker } from './EmotionPicker';
import { IntensityControl } from './IntensityControl';

export interface EmotionSectionProps {
  title: string;
  hint?: string;
  ratings: EmotionRating[];
  custom: CustomEmotion[];
  recent: string[];
  onChange(ratings: EmotionRating[]): void;
  onAddCustom(name: string, family: EmotionFamily | null): void;
}

/** Selected emotion chips, the picker button and one intensity control per emotion (spec §5.2). */
export function EmotionSection({
  title,
  hint,
  ratings,
  custom,
  recent,
  onChange,
  onAddCustom,
}: EmotionSectionProps) {
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const remove = (name: string) => onChange(ratings.filter((r) => r.name !== name));

  function toggle(name: string) {
    if (ratings.some((r) => r.name === name)) remove(name);
    else onChange([...ratings, { name, intensity: null }]);
  }

  function setIntensity(name: string, intensity: number) {
    onChange(ratings.map((r) => (r.name === name ? { ...r, intensity } : r)));
  }

  return (
    <section className="editor-section" aria-labelledby={headingId}>
      <h2 id={headingId} className="editor-heading">
        {title}
      </h2>
      {hint && <p className="editor-hint">{hint}</p>}
      <div className="chip-row">
        {ratings.map((r) => (
          <EmotionChip key={r.name} name={r.name} custom={custom} onRemove={() => remove(r.name)} />
        ))}
        <button type="button" className="button-dashed" onClick={() => setOpen(true)}>
          + Добавить эмоцию
        </button>
      </div>
      {ratings.length > 0 && (
        <div className="editor-intensities">
          {ratings.map((r) => (
            <IntensityControl
              key={r.name}
              label={r.name}
              value={r.intensity}
              min={1}
              unit=""
              onChange={(value) => setIntensity(r.name, value)}
            />
          ))}
        </div>
      )}
      <EmotionPicker
        open={open}
        selectedNames={ratings.map((r) => r.name)}
        recent={recent}
        custom={custom}
        onToggle={toggle}
        onAddCustom={onAddCustom}
        onClose={close}
      />
    </section>
  );
}
