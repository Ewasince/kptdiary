import { useId, type ReactNode } from 'react';
import {
  DYADS,
  FAMILIES,
  chipColors,
  lookupEmotion,
  normalizeEmotionName,
} from '../../model/emotions';
import type { CustomEmotion } from '../../model/types';

export interface PickChipProps {
  name: string;
  custom: CustomEmotion[];
  selected: boolean;
  onToggle(name: string): void;
}

/** Toggle chip for the picker; blends stay white with a dashed border until selected. */
export function PickChip({ name, custom, selected, onToggle }: PickChipProps) {
  const info = lookupEmotion(name, custom);
  const colors = chipColors(info);
  const className = ['chip', 'chip--pick', info.dyad && 'chip--dyad', selected && 'chip--selected']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={className}
      aria-pressed={selected}
      style={{
        background: info.dyad && !selected ? '#fff' : colors.background,
        borderColor: colors.border,
      }}
      onClick={() => onToggle(name)}
    >
      {name}
    </button>
  );
}

export interface ChipSectionProps {
  title: string;
  dotColor?: string;
  children: ReactNode;
}

/** A titled group of chips, exposed as a region named by its heading. */
export function ChipSection({ title, dotColor, children }: ChipSectionProps) {
  const headingId = useId();
  return (
    <section className="chip-section" aria-labelledby={headingId}>
      <h3 id={headingId} className="chip-section-title">
        {dotColor && <span className="dot" style={{ background: dotColor }} aria-hidden="true" />}
        {title}
      </h3>
      <div className="chip-row">{children}</div>
    </section>
  );
}

export interface EmotionListProps {
  selectedNames: string[];
  recent: string[];
  custom: CustomEmotion[];
  onToggle(name: string): void;
}

export function EmotionList({ selectedNames, recent, custom, onToggle }: EmotionListProps) {
  const chips = (names: string[]) =>
    names.map((name) => (
      <PickChip
        key={name}
        name={name}
        custom={custom}
        selected={selectedNames.includes(name)}
        onToggle={onToggle}
      />
    ));
  const own = custom.map((c) => normalizeEmotionName(c.name));

  return (
    <div className="emotion-list">
      {recent.length > 0 && <ChipSection title="Недавние">{chips(recent)}</ChipSection>}
      {FAMILIES.map((family, i) => (
        <ChipSection key={family.id} title={family.label} dotColor={family.color}>
          {chips([...family.levels, DYADS[i].name])}
        </ChipSection>
      ))}
      {own.length > 0 && <ChipSection title="Свои">{chips(own)}</ChipSection>}
    </div>
  );
}
