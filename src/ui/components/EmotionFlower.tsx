import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { DYADS, FAMILIES } from '../../model/emotions';
import type { EmotionFamily } from '../../model/types';

// Flower geometry, spec §5.4: everything is derived from these numbers and the catalog.
const VIEW = 440;
const CENTER = VIEW / 2;
const PETAL_DISTANCE = 78;
const PETAL_RX = 38;
const PETAL_RY = 78;
const BASE_LABEL_RADIUS = 90;
const DYAD_LABEL_RADIUS = 161;
const OUTER_RADIUS = 180;
const DISC_RADIUS = 104;
const STEP = 360 / FAMILIES.length;
const BASELINE_OFFSET = 4;

const DARK = '#1F2328';
const GREY = '#6B7680';
const FADED_OPACITY = 0.32;
/** Per-petal opacity from the approved mockup; light colours need more to stay readable. */
const PETAL_OPACITY: Record<EmotionFamily, number> = {
  joy: 0.78,
  trust: 0.82,
  fear: 0.95,
  surprise: 0.78,
  sadness: 0.85,
  disgust: 0.78,
  anger: 0.82,
  anticipation: 0.78,
};

export function petalTransform(index: number): string {
  return `rotate(${STEP * index} ${CENTER} ${CENTER})`;
}

/** Angle 0 points up, angles grow clockwise. */
export function labelPosition(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(rad), y: CENTER - radius * Math.cos(rad) };
}

function onActivateKey(event: KeyboardEvent, activate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
  }
}

export interface EmotionFlowerProps {
  selectedFamily: EmotionFamily | null;
  selectedNames: string[];
  onSelectFamily(id: EmotionFamily): void;
  onToggleDyad(name: string): void;
  size?: number;
}

export function EmotionFlower({
  selectedFamily,
  selectedNames,
  onSelectFamily,
  onToggleDyad,
  size,
}: EmotionFlowerProps) {
  const petalRefs = useRef(new Map<EmotionFamily, SVGGElement>());
  const refocus = useRef<EmotionFamily | null>(null);

  // The selected petal is drawn last so it sits on top; moving its node drops focus,
  // so give focus back when the petal had it.
  useLayoutEffect(() => {
    const id = refocus.current;
    refocus.current = null;
    if (id !== null) petalRefs.current.get(id)?.focus();
  }, [selectedFamily]);

  function selectFamily(id: EmotionFamily) {
    refocus.current = document.activeElement === petalRefs.current.get(id) ? id : null;
    onSelectFamily(id);
  }

  const petals = FAMILIES.map((family, index) => ({ family, index }));
  const drawOrder = [
    ...petals.filter((p) => p.family.id !== selectedFamily),
    ...petals.filter((p) => p.family.id === selectedFamily),
  ];

  return (
    <svg
      className="flower"
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      style={size === undefined ? undefined : { width: size, height: size }}
    >
      <circle
        cx={CENTER}
        cy={CENTER}
        r={OUTER_RADIUS}
        fill="none"
        stroke="#C9D0D6"
        strokeDasharray="6 6"
      />
      <circle cx={CENTER} cy={CENTER} r={DISC_RADIUS} fill="#F4F6F8" />

      {drawOrder.map(({ family, index }) => {
        const selected = family.id === selectedFamily;
        const opacity =
          selectedFamily === null || selected ? PETAL_OPACITY[family.id] : FADED_OPACITY;
        return (
          <g
            key={family.id}
            ref={(el) => {
              if (el) petalRefs.current.set(family.id, el);
              else petalRefs.current.delete(family.id);
            }}
            className="flower-petal"
            transform={petalTransform(index)}
            role="button"
            tabIndex={0}
            aria-label={family.label}
            aria-pressed={selected}
            onClick={() => selectFamily(family.id)}
            onKeyDown={(e) => onActivateKey(e, () => selectFamily(family.id))}
          >
            <ellipse
              cx={CENTER}
              cy={CENTER - PETAL_DISTANCE}
              rx={PETAL_RX}
              ry={PETAL_RY}
              fill={family.color}
              fillOpacity={opacity}
            />
          </g>
        );
      })}

      {FAMILIES.map((family, index) => {
        const { x, y } = labelPosition(STEP * index, BASE_LABEL_RADIUS);
        const dark = selectedFamily === null || family.id === selectedFamily;
        return (
          <text
            key={family.id}
            className="flower-label"
            x={x}
            y={y + BASELINE_OFFSET}
            textAnchor="middle"
            fontSize={12}
            fontWeight={600}
            fill={dark ? DARK : GREY}
            aria-hidden="true"
          >
            {family.label}
          </text>
        );
      })}

      {DYADS.map((dyad, index) => {
        const { x, y } = labelPosition(STEP / 2 + STEP * index, DYAD_LABEL_RADIUS);
        const dark = selectedFamily === null || dyad.families.includes(selectedFamily);
        const pressed = selectedNames.includes(dyad.name);
        return (
          <text
            key={dyad.name}
            className="flower-dyad"
            x={x}
            y={y + BASELINE_OFFSET}
            textAnchor="middle"
            fontSize={11}
            fontWeight={pressed ? 700 : 500}
            fill={dark ? DARK : GREY}
            role="button"
            tabIndex={0}
            aria-pressed={pressed}
            onClick={() => onToggleDyad(dyad.name)}
            onKeyDown={(e) => onActivateKey(e, () => onToggleDyad(dyad.name))}
          >
            {dyad.name}
          </text>
        );
      })}
    </svg>
  );
}
