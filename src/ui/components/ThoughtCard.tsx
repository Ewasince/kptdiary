import { useId } from 'react';
import type { Thought } from '../../model/types';
import { useIsDesktop } from '../useMediaQuery';
import { IntensityControl } from './IntensityControl';

export interface ThoughtCardProps {
  index: number;
  thought: Thought;
  onChange(thought: Thought): void;
  onRemove(): void;
}

const HINT = 'Ответ и переоценка ещё не заполнены';

/** One automatic thought with its rational response and re-rating (spec §5.2). */
export function ThoughtCard({ index, thought, onChange, onRemove }: ThoughtCardProps) {
  const isDesktop = useIsDesktop();
  const titleId = useId();
  const responseId = useId();
  const set = (fields: Partial<Thought>) => onChange({ ...thought, ...fields });
  const unfinished =
    thought.response.trim() === '' ||
    thought.responseBelief === null ||
    thought.beliefAfter === null;

  const text = (
    <textarea
      className="editor-textarea"
      aria-label="Автоматическая мысль"
      rows={2}
      value={thought.text}
      onChange={(e) => set({ text: e.target.value })}
    />
  );
  const belief = (
    <IntensityControl
      label="Насколько убедительна"
      value={thought.belief}
      min={0}
      unit="%"
      onChange={(value) => set({ belief: value })}
    />
  );
  const response = (
    <div className="thought-response">
      <label htmlFor={responseId} className="thought-label">
        Рациональный ответ
      </label>
      <textarea
        id={responseId}
        className="editor-textarea"
        rows={3}
        value={thought.response}
        onChange={(e) => set({ response: e.target.value })}
      />
    </div>
  );
  const reRating = (
    <>
      <IntensityControl
        label="Убедительность ответа"
        value={thought.responseBelief}
        min={0}
        unit="%"
        onChange={(value) => set({ responseBelief: value })}
      />
      <IntensityControl
        label="Мысль убедительна сейчас"
        value={thought.beliefAfter}
        min={0}
        unit="%"
        onChange={(value) => set({ beliefAfter: value })}
      />
    </>
  );

  // DOM order follows the visual order of each layout, so Tab moves as the eye does.
  return (
    <div className="thought">
      <article className="thought-card" aria-labelledby={titleId}>
        <div className="thought-head">
          <h3 id={titleId} className="thought-title">
            Мысль {index + 1}
          </h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Удалить мысль"
            onClick={onRemove}
          >
            ×
          </button>
        </div>
        {isDesktop ? (
          <>
            <div className="thought-columns">
              {text}
              {response}
            </div>
            {belief}
            {reRating}
          </>
        ) : (
          <>
            {text}
            {belief}
            <hr className="thought-divider" />
            {response}
            {reRating}
          </>
        )}
      </article>
      {unfinished && <p className="thought-hint">{HINT}</p>}
    </div>
  );
}
