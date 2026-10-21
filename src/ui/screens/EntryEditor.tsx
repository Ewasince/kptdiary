import { useEffect, useId, useRef } from 'react';
import { normalizeEmotionName } from '../../model/emotions';
import { createThought, isEmptyEntry, removeEntry, replaceEntry, touch } from '../../model/entry';
import { recentEmotions } from '../../model/recent';
import type { Diary, EmotionFamily, Entry, Thought } from '../../model/types';
import { EmotionSection } from '../components/EmotionSection';
import { ThoughtCard } from '../components/ThoughtCard';
import { isoToLocalInput, localInputToIso } from '../format';
import { navigate } from '../router';
import { useDiary } from '../useDiary';

const SITUATION_HINT = 'Событие, мысли, образы или воспоминания, вызвавшие неприятную эмоцию';
const OUTCOME_HINT = 'Какая эмоция осталась после ответа и насколько она сильна';

function TrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Removes the entry physically when it is still empty in the diary being updated, which
 * may be newer than the last render (another tab may have filled it in meanwhile).
 */
function removeIfEmpty(d: Diary, id: string): Diary {
  const stored = d.entries.find((e) => e.id === id);
  return stored !== undefined && isEmptyEntry(stored) ? removeEntry(d, id) : d;
}

/**
 * Removes the entry physically when the editor goes away and the entry is still empty
 * (spec §3). The check waits a microtask so StrictMode's simulated unmount, which mounts
 * again synchronously, does not delete a fresh entry.
 */
function useRemoveIfEmptyOnLeave(id: string, entry: Entry | undefined) {
  const { update } = useDiary();
  const entryRef = useRef(entry);
  const mountedRef = useRef(false);
  useEffect(() => {
    entryRef.current = entry;
  });
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      queueMicrotask(() => {
        const current = entryRef.current;
        if (!mountedRef.current && current !== undefined && isEmptyEntry(current)) {
          update((d) => removeIfEmpty(d, id));
        }
      });
    };
  }, [id, update]);
}

export function EntryEditor({ id }: { id: string }) {
  const { diary, update, now } = useDiary();
  const found = diary.entries.find((e) => e.id === id);
  const entry = found?.deletedAt === null ? found : undefined;
  useRemoveIfEmptyOnLeave(id, entry);
  const situationId = useId();
  const situationHintId = useId();
  const thoughtsId = useId();

  if (entry === undefined) {
    return (
      <div className="empty-state">
        <p>Запись не найдена</p>
        <a href="#/">К списку</a>
      </div>
    );
  }
  const current = entry;

  function change(next: Entry) {
    update((d) => replaceEntry(d, touch(next, now())));
  }

  function setThought(index: number, thought: Thought) {
    change({ ...current, thoughts: current.thoughts.map((t, i) => (i === index ? thought : t)) });
  }

  function addCustom(name: string, family: EmotionFamily | null) {
    update((d) =>
      d.customEmotions.some((c) => normalizeEmotionName(c.name) === name)
        ? d
        : { ...d, customEmotions: [...d.customEmotions, { name, family }] },
    );
  }

  function onDateChange(value: string) {
    const iso = localInputToIso(value);
    if (iso !== null) change({ ...current, createdAt: iso });
  }

  function onDelete() {
    if (!window.confirm('Удалить запись?')) return;
    const at = now();
    // An empty entry has been nowhere else, so it needs no tombstone (spec §3).
    update((d) => {
      const stored = d.entries.find((e) => e.id === id);
      if (stored === undefined) return d;
      return isEmptyEntry(stored)
        ? removeEntry(d, id)
        : replaceEntry(d, { ...stored, deletedAt: at, updatedAt: at });
    });
    navigate({ name: 'list' });
  }

  function onDone() {
    if (isEmptyEntry(current)) update((d) => removeIfEmpty(d, id));
    navigate({ name: 'list' });
  }

  const recent = recentEmotions(diary.entries, now());
  const outcomeRecent = [...new Set([...current.emotions.map((r) => r.name), ...recent])];

  return (
    <div className="editor">
      <div className="editor-top">
        <a href="#/" className="icon-button" aria-label="Назад к списку">
          ←
        </a>
        <label className="editor-when">
          <span className="editor-when-label">Когда</span>
          <input
            type="datetime-local"
            className="editor-date"
            value={isoToLocalInput(current.createdAt)}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label="Удалить запись"
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>

      <section className="editor-section" aria-labelledby={situationId}>
        <h2 id={situationId} className="editor-heading">
          Ситуация
        </h2>
        <p id={situationHintId} className="editor-hint">
          {SITUATION_HINT}
        </p>
        <textarea
          className="editor-textarea"
          aria-labelledby={situationId}
          aria-describedby={situationHintId}
          rows={3}
          value={current.situation}
          onChange={(e) => change({ ...current, situation: e.target.value })}
        />
      </section>

      <EmotionSection
        title="Эмоции"
        ratings={current.emotions}
        custom={diary.customEmotions}
        recent={recent}
        onChange={(emotions) => change({ ...current, emotions })}
        onAddCustom={addCustom}
      />

      <section className="editor-section" aria-labelledby={thoughtsId}>
        <h2 id={thoughtsId} className="editor-heading">
          Автоматические мысли
        </h2>
        <div className="thought-list">
          {current.thoughts.map((thought, index) => (
            <ThoughtCard
              key={thought.id}
              index={index}
              thought={thought}
              onChange={(t) => setThought(index, t)}
              onRemove={() =>
                change({
                  ...current,
                  thoughts: current.thoughts.filter((t) => t.id !== thought.id),
                })
              }
            />
          ))}
        </div>
        <button
          type="button"
          className="button-dashed button-wide"
          onClick={() => change({ ...current, thoughts: [...current.thoughts, createThought()] })}
        >
          + Ещё мысль
        </button>
      </section>

      <EmotionSection
        title="Результат"
        hint={OUTCOME_HINT}
        ratings={current.outcomeEmotions}
        custom={diary.customEmotions}
        recent={outcomeRecent}
        onChange={(outcomeEmotions) => change({ ...current, outcomeEmotions })}
        onAddCustom={addCustom}
      />

      <div className="editor-footer">
        <button type="button" className="button-primary" onClick={onDone}>
          Готово
        </button>
        <span className="editor-note">Изменения сохраняются автоматически</span>
      </div>
    </div>
  );
}
