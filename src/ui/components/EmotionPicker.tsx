import { useEffect, useRef, useState } from 'react';
import {
  FAMILIES,
  allEmotionNames,
  familyNeighbors,
  normalizeEmotionName,
  searchEmotions,
} from '../../model/emotions';
import type { CustomEmotion, EmotionFamily } from '../../model/types';
import { useIsDesktop } from '../useMediaQuery';
import { EmotionChip } from './EmotionChip';
import { EmotionFlower } from './EmotionFlower';
import { ChipSection, EmotionList, pickChips } from './EmotionList';

const SEARCH_PLACEHOLDER = 'Найти или добавить свою…';
const DESKTOP_FLOWER_SIZE = 540;

export interface EmotionPickerProps {
  open: boolean;
  selectedNames: string[];
  recent: string[];
  custom: CustomEmotion[];
  onToggle(name: string): void;
  onAddCustom(name: string, family: EmotionFamily | null): void;
  onClose(): void;
}

type View = 'flower' | 'list';

export function EmotionPicker({
  open,
  selectedNames,
  recent,
  custom,
  onToggle,
  onAddCustom,
  onClose,
}: EmotionPickerProps) {
  const desktop = useIsDesktop();
  const [view, setView] = useState<View>('flower');
  const [query, setQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<EmotionFamily | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
    else setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const normalized = normalizeEmotionName(query);
  const chips = (names: string[]) => pickChips(names, { selectedNames, custom, onToggle });

  function addCustom(family: EmotionFamily | null) {
    onAddCustom(normalized, family);
    onToggle(normalized);
    setQuery('');
  }

  function renderSearch() {
    const matches = searchEmotions(query, custom);
    const known = allEmotionNames(custom).includes(normalized);
    return (
      <div className="picker-search-results">
        {matches.length > 0 && <div className="chip-row">{chips(matches)}</div>}
        {!known && (
          <div className="picker-add">
            <button type="button" className="picker-add-button" onClick={() => addCustom(null)}>
              {`Добавить „${normalized}“`}
            </button>
            <div className="picker-add-families" role="group" aria-label="Семья">
              {FAMILIES.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  className="family-button"
                  onClick={() => addCustom(family.id)}
                >
                  <span className="dot" style={{ background: family.color }} aria-hidden="true" />
                  {family.label}
                </button>
              ))}
              <button type="button" className="family-button" onClick={() => addCustom(null)}>
                Без семьи
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFamilySection() {
    const family = FAMILIES.find((f) => f.id === selectedFamily);
    if (!family) return null;
    const { dyads } = familyNeighbors(family.id);
    return (
      <ChipSection title={family.label} dotColor={family.color}>
        {chips(family.levels)}
        <span className="chip-divider" aria-hidden="true" />
        {chips(dyads.map((d) => d.name))}
      </ChipSection>
    );
  }

  function renderFlowerView() {
    const flower = (
      <EmotionFlower
        selectedFamily={selectedFamily}
        selectedNames={selectedNames}
        onSelectFamily={setSelectedFamily}
        onToggleDyad={onToggle}
        size={desktop ? DESKTOP_FLOWER_SIZE : undefined}
      />
    );
    if (!desktop) {
      return (
        <div className="picker-flower-view">
          {flower}
          {renderFamilySection()}
        </div>
      );
    }
    return (
      <div className="picker-columns">
        {flower}
        <div className="picker-aside">
          {renderFamilySection()}
          {selectedNames.length > 0 && (
            <ChipSection title="Выбрано в этой записи">
              {selectedNames.map((name) => (
                <EmotionChip
                  key={name}
                  name={name}
                  custom={custom}
                  onRemove={() => onToggle(name)}
                />
              ))}
            </ChipSection>
          )}
          {recent.length > 0 && <ChipSection title="Недавние">{chips(recent)}</ChipSection>}
        </div>
      </div>
    );
  }

  function renderBody() {
    if (normalized !== '') return renderSearch();
    if (view === 'list') {
      return (
        <EmotionList
          selectedNames={selectedNames}
          recent={recent}
          custom={custom}
          onToggle={onToggle}
        />
      );
    }
    return renderFlowerView();
  }

  return (
    <div
      className="picker-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={desktop ? 'picker picker--modal' : 'picker picker--sheet'}
        role="dialog"
        aria-modal="true"
        aria-label="Выбор эмоции"
        tabIndex={-1}
      >
        {!desktop && <div className="picker-handle" aria-hidden="true" />}
        <div className="picker-header">
          <h2>Эмоции</h2>
          <button type="button" className="button-primary" onClick={onClose}>
            Готово
          </button>
        </div>
        <div className="picker-tools">
          <div className="view-toggle">
            <button type="button" aria-pressed={view === 'flower'} onClick={() => setView('flower')}>
              Цветок
            </button>
            <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              Список
            </button>
          </div>
          <input
            type="search"
            className="picker-search"
            placeholder={SEARCH_PLACEHOLDER}
            aria-label={SEARCH_PLACEHOLDER}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="picker-body">{renderBody()}</div>
      </div>
    </div>
  );
}
