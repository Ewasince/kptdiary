import { Fragment } from 'react';
import { isComplete } from '../../model/entry';
import { normalizeEmotionName } from '../../model/emotions';
import { localDayKey } from '../../model/period';
import type { CustomEmotion, EmotionRating, Entry } from '../../model/types';
import { EmotionChip } from '../components/EmotionChip';
import { formatDayHeading, formatMonthYear, formatTime, plural } from '../format';
import { routeHash } from '../router';
import { useDiary } from '../useDiary';
import { useIsDesktop } from '../useMediaQuery';
import { useNewEntry } from '../useNewEntry';

export interface DayGroup {
  heading: string;
  entries: Entry[];
}

/** Newest first, grouped by local calendar day of `createdAt`. */
export function groupEntriesByDay(entries: Entry[], now: string): DayGroup[] {
  const sorted = [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const groups: { key: string; group: DayGroup }[] = [];
  for (const entry of sorted) {
    const key = localDayKey(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.group.entries.push(entry);
    } else {
      const heading = formatDayHeading(entry.createdAt, now);
      groups.push({ key, group: { heading, entries: [entry] } });
    }
  }
  return groups.map((g) => g.group);
}

export interface EmotionPair {
  name: string;
  before: EmotionRating | null;
  after: EmotionRating | null;
}

/**
 * Before/after pairs for emotions present in both lists (matched by normalized name),
 * then before-only, then after-only emotions, each with the other side null.
 */
export function pairEmotions(entry: Entry): EmotionPair[] {
  const unmatched = [...entry.outcomeEmotions];
  const pairs: EmotionPair[] = [];
  const beforeOnly: EmotionPair[] = [];
  for (const before of entry.emotions) {
    const key = normalizeEmotionName(before.name);
    const index = unmatched.findIndex((after) => normalizeEmotionName(after.name) === key);
    if (index === -1) {
      beforeOnly.push({ name: before.name, before, after: null });
    } else {
      pairs.push({ name: before.name, before, after: unmatched[index] });
      unmatched.splice(index, 1);
    }
  }
  const afterOnly = unmatched.map((after) => ({ name: after.name, before: null, after }));
  return [...pairs, ...beforeOnly, ...afterOnly];
}

const ENTRY_FORMS = ['запись', 'записи', 'записей'] as const;
const UNFINISHED_FORMS = ['не завершена', 'не завершены', 'не завершены'] as const;

function Emotions({ entry, custom }: { entry: Entry; custom: CustomEmotion[] }) {
  return (
    <>
      {pairEmotions(entry).map(({ name, before, after }, i) => {
        const key = `${i}-${name}`;
        const beforeChip = before && (
          <EmotionChip name={before.name} intensity={before.intensity} custom={custom} />
        );
        const afterChip = after && (
          <EmotionChip
            name={after.name}
            intensity={after.intensity}
            custom={custom}
            variant="after"
          />
        );
        if (beforeChip && afterChip) {
          return (
            <span key={key} className="pair">
              {beforeChip}
              <span>→</span>
              {afterChip}
            </span>
          );
        }
        return <Fragment key={key}>{beforeChip ?? afterChip}</Fragment>;
      })}
    </>
  );
}

function UnfinishedBadge() {
  return <span className="badge">Не завершена</span>;
}

interface EntryRowProps {
  entry: Entry;
  custom: CustomEmotion[];
  isDesktop: boolean;
}

function EntryRow({ entry, custom, isDesktop }: EntryRowProps) {
  const time = <span className="entry-time">{formatTime(entry.createdAt)}</span>;
  const situation = <span className="entry-situation">{entry.situation.split('\n')[0]}</span>;
  const badge = isComplete(entry) ? null : <UnfinishedBadge />;
  return (
    <li>
      <a className="entry-card" href={routeHash({ name: 'entry', id: entry.id })}>
        {isDesktop ? (
          <>
            {time}
            {situation}
            <span className="entry-emotions">
              <Emotions entry={entry} custom={custom} />
              {badge}
            </span>
          </>
        ) : (
          <>
            <span className="entry-top">
              {time}
              {badge}
            </span>
            {situation}
            <span className="entry-emotions">
              <Emotions entry={entry} custom={custom} />
            </span>
          </>
        )}
      </a>
    </li>
  );
}

export function EntryList() {
  const { diary, now } = useDiary();
  const isDesktop = useIsDesktop();
  const onNew = useNewEntry();
  const current = now();
  const entries = diary.entries.filter((entry) => entry.deletedAt === null);
  const unfinished = entries.filter((entry) => !isComplete(entry)).length;

  const newButton = (
    <button type="button" className="button-primary new-entry" onClick={onNew}>
      Новая запись
    </button>
  );

  const summary =
    entries.length === 0
      ? null
      : `${entries.length} ${plural(entries.length, ENTRY_FORMS)}` +
        (unfinished > 0 ? `, ${unfinished} ${plural(unfinished, UNFINISHED_FORMS)}` : '');

  return (
    <section className="entry-list">
      <div className="page-heading">
        <h1>{isDesktop ? 'Записи' : 'Дневник'}</h1>
        <span className="page-heading-aside">{isDesktop ? summary : formatMonthYear(current)}</span>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          <p>Записей пока нет</p>
          {newButton}
        </div>
      ) : (
        <>
          {!isDesktop && newButton}
          {groupEntriesByDay(entries, current).map((group) => (
            <section key={group.heading} className="day-group">
              <h2 className="day-heading">{group.heading}</h2>
              <ul className="entry-rows">
                {group.entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    custom={diary.customEmotions}
                    isDesktop={isDesktop}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
