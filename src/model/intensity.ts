/** Value the controls start from when nothing has been entered yet (spec §5.3). */
export const NULL_START = 50;

export type IntensityStep = -10 | -5 | -1 | 1 | 5 | 10;

export function clampIntensity(value: number, min: number, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * ±1 adds the step. Positive larger steps go to the next multiple of the step
 * strictly above the value, negative ones to the nearest multiple strictly
 * below it. The result is clamped to [min, max].
 */
export function stepIntensity(
  value: number | null,
  step: IntensityStep,
  min: number,
  max = 100,
): number {
  const v = value ?? NULL_START;
  let next: number;
  if (Math.abs(step) === 1) {
    next = v + step;
  } else if (step > 0) {
    next = (Math.floor(v / step) + 1) * step;
  } else {
    const size = -step;
    next = (Math.ceil(v / size) - 1) * size;
  }
  return clampIntensity(next, min, max);
}
