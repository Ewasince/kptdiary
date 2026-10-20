import { chipColors, lookupEmotion } from '../../model/emotions';
import type { CustomEmotion } from '../../model/types';

export interface EmotionChipProps {
  name: string;
  intensity?: number | null;
  custom: CustomEmotion[];
  variant?: 'default' | 'after';
  onRemove?: () => void;
}

export function EmotionChip({
  name,
  intensity,
  custom,
  variant = 'default',
  onRemove,
}: EmotionChipProps) {
  const colors = chipColors(lookupEmotion(name, custom));
  const label = intensity === null || intensity === undefined ? name : `${name} ${intensity}`;
  return (
    <span
      className={variant === 'after' ? 'chip chip-after' : 'chip'}
      style={
        variant === 'after' ? undefined : { background: colors.background, borderColor: colors.border }
      }
    >
      <span className="chip-label">{label}</span>
      {onRemove && (
        <button
          type="button"
          className="chip-remove"
          aria-label={`Убрать: ${name}`}
          onClick={onRemove}
        >
          ×
        </button>
      )}
    </span>
  );
}
