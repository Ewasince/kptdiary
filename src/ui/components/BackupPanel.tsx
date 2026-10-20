import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { mergeDiaries, mergeSummary } from '../../model/merge';
import { ImportError, migrate } from '../../model/migrate';
import { formatDayMonth, localDayKey } from '../../model/period';
import type { Diary } from '../../model/types';
import { getLastBackupAt, setLastBackupAt } from '../../storage/diaryStore';
import { downloadText, readTextFile } from '../../storage/files';
import { plural } from '../format';
import { useDiary } from '../useDiary';

const READ_FAILED = 'Не удалось прочитать файл';
const APPLY_FAILED = 'Импорт не сохранён: место закончилось или хранилище недоступно';

/** Whole calendar days from one `YYYY-MM-DD` key to another. */
function daysBetween(fromKey: string, toKey: string): number {
  const utc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(toKey) - utc(fromKey)) / 86_400_000);
}

function lastBackupLine(lastBackupAt: string | null, now: string): string {
  if (lastBackupAt === null) return 'Последний бэкап: ещё не было';
  const key = localDayKey(lastBackupAt);
  const days = daysBetween(key, localDayKey(now));
  return `Последний бэкап: ${formatDayMonth(key)}, ${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
}

function BoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M3 7h18v4H3zM5 11v9h14v-9M10 15h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** «Бэкап и перенос»: JSON download and import with a merge preview (spec §5.5, §6). */
export function BackupPanel() {
  const { diary, replace, now } = useDiary();
  const [lastBackupAt, setLastBackup] = useState(() => getLastBackupAt());
  const [pending, setPending] = useState<Diary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function onDownload() {
    const at = now();
    const json = JSON.stringify({ ...diary, exportedAt: at }, null, 2);
    downloadText(`kptdiary-${localDayKey(at)}.json`, json, 'application/json');
    setLastBackupAt(at);
    setLastBackup(at);
  }

  async function onFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Let the same file be chosen again.
    input.value = '';
    if (!file) return;
    setPending(null);
    setError(null);
    setApplied(false);
    try {
      setPending(migrate(JSON.parse(await readTextFile(file))));
    } catch (e) {
      setError(e instanceof ImportError ? e.message : READ_FAILED);
    }
  }

  function onApply() {
    if (pending === null) return;
    const saved = replace(mergeDiaries(diary, pending));
    setPending(null);
    if (saved) setApplied(true);
    else setError(APPLY_FAILED);
  }

  const summary = pending && mergeSummary(diary, pending);

  return (
    <section className="panel" aria-labelledby="backup-heading">
      <div className="panel-head">
        <BoxIcon />
        <h2 id="backup-heading">Бэкап и перенос</h2>
      </div>
      <p className="panel-hint">
        Файл со всеми данными. Импорт добавляет новые записи и обновляет изменённые, ничего не
        стирает.
      </p>
      <div className="panel-actions">
        <button type="button" className="button-primary" onClick={onDownload}>
          Скачать JSON
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => fileInput.current?.click()}
        >
          Импортировать
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="Файл бэкапа"
          hidden
          onChange={(e) => void onFileChosen(e)}
        />
      </div>
      {summary && (
        <div className="import-summary">
          <p>
            {`Новых записей: ${summary.added}, обновлённых: ${summary.updated}, ` +
              `своих эмоций: ${summary.customEmotions}`}
          </p>
          <button type="button" className="button-primary" onClick={onApply}>
            Применить
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="panel-error">
          {error}
        </p>
      )}
      {applied && (
        <p role="status" className="panel-success">
          Импорт применён
        </p>
      )}
      <p className="panel-info panel-info--box">{lastBackupLine(lastBackupAt, now())}</p>
    </section>
  );
}
