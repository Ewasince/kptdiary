/** Small stroke icons; decorative, so hidden from assistive technology. */

function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusIcon() {
  return <Icon d="M12 5v14M5 12h14" size={20} />;
}

export function ListIcon() {
  return <Icon d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />;
}

export function ExportIcon() {
  return <Icon d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7" />;
}
