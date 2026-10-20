import { useState } from 'react';
import { isComplete } from '../../model/entry';
import { entriesInPeriod, formatDayMonth, localDayKey, presetPeriod } from '../../model/period';
import type { Period, PeriodPreset, PresetContext } from '../../model/period';
import type { Diary } from '../../model/types';
import { renderReport } from '../../report/render';
import { downloadText } from '../../storage/files';
import { BackupPanel } from '../components/BackupPanel';
import { plural } from '../format';
import { useDiary } from '../useDiary';

const PRESETS: readonly { preset: PeriodPreset; label: string }[] = [
  { preset: 'day', label: 'День' },
  { preset: 'week', label: 'Неделя' },
  { preset: 'month', label: 'Месяц' },
  { preset: 'all', label: 'Всё время' },
  { preset: 'sinceExport', label: 'С последней выгрузки' },
];

const ENTRY_FORMS = ['запись', 'записи', 'записей'] as const;
const UNFINISHED_FORMS = ['незавершённая', 'незавершённые', 'незавершённых'] as const;

/** Keeps a blob URL alive long enough for the new tab to load it. */
const BLOB_URL_LIFETIME_MS = 60_000;

export function buildReportHtml(diary: Diary, period: Period, now: string): string {
  return renderReport({
    entries: entriesInPeriod(diary.entries, period),
    period,
    customEmotions: diary.customEmotions,
    generatedAt: now,
  });
}

export function reportFilename(now: string): string {
  return `kptdiary-report-${localDayKey(now)}.html`;
}

function DocumentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Writes the report into a new window and opens the print dialog; false if blocked. */
function printReport(html: string): boolean {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  // The written document is already complete, so `load` may never fire.
  setTimeout(() => w.print(), 0);
  return true;
}

/** Opens the report as a blob URL in a new tab; false if blocked. */
function openReport(html: string): boolean {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const w = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
  return w !== null;
}

function ReportPanel() {
  const { diary, update, now } = useDiary();
  const ctx: PresetContext = {
    now: now(),
    entries: diary.entries,
    lastReportExportAt: diary.lastReportExportAt,
  };
  const [activePreset, setActivePreset] = useState<PeriodPreset | null>('month');
  // «Месяц» never yields null.
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month', ctx) as Period);

  const inPeriod = entriesInPeriod(diary.entries, period);
  const unfinished = inPeriod.filter((e) => !isComplete(e)).length;
  const inverted = period.from > period.to;
  const lastExport = diary.lastReportExportAt;

  function choosePreset(preset: PeriodPreset) {
    const next = presetPeriod(preset, ctx);
    if (next === null) return;
    setPeriod(next);
    setActivePreset(preset);
  }

  function editDate(field: keyof Period, value: string) {
    if (value === '') return;
    setPeriod((p) => ({ ...p, [field]: value }));
    setActivePreset(null);
  }

  function exportReport(deliver: (html: string, at: string) => boolean) {
    const at = now();
    if (deliver(buildReportHtml(diary, period, at), at)) {
      update((d) => ({ ...d, lastReportExportAt: at }));
    }
  }

  return (
    <section className="panel" aria-labelledby="report-heading">
      <div className="panel-head">
        <DocumentIcon />
        <h2 id="report-heading">Отчёт для терапевта</h2>
      </div>
      <p className="panel-hint">
        Красивая страница с записями за период. Из неё можно сохранить PDF.
      </p>
      <div className="period-controls">
        <div className="chip-row">
          {PRESETS.map(({ preset, label }) => {
            const unavailable = preset === 'sinceExport' && lastExport === null;
            return (
              <button
                key={preset}
                type="button"
                className="period-chip"
                aria-pressed={activePreset === preset}
                disabled={unavailable}
                title={unavailable ? 'Выгрузок ещё не было' : undefined}
                onClick={() => choosePreset(preset)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="period-dates">
          <label className="date-field">
            <span>С</span>
            <input
              type="date"
              aria-label="С"
              value={period.from}
              onChange={(e) => editDate('from', e.target.value)}
            />
          </label>
          <label className="date-field">
            <span>По</span>
            <input
              type="date"
              aria-label="По"
              value={period.to}
              onChange={(e) => editDate('to', e.target.value)}
            />
          </label>
        </div>
      </div>
      {inverted && <p className="panel-info">Дата начала позже даты конца</p>}
      <p className="panel-info">
        {`В период попадает ${inPeriod.length} ${plural(inPeriod.length, ENTRY_FORMS)}, ` +
          `из них ${unfinished} ${plural(unfinished, UNFINISHED_FORMS)}`}
      </p>
      <p className="panel-info">
        {`Последняя выгрузка отчёта: ${
          lastExport === null ? 'ещё не было' : formatDayMonth(localDayKey(lastExport))
        }`}
      </p>
      <div className="panel-actions">
        <button
          type="button"
          className="button-primary"
          disabled={inverted}
          onClick={() => exportReport(openReport)}
        >
          Открыть отчёт
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={inverted}
          onClick={() =>
            exportReport((html, at) => {
              downloadText(reportFilename(at), html, 'text/html');
              return true;
            })
          }
        >
          Сохранить HTML
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={inverted}
          onClick={() => exportReport(printReport)}
        >
          Сохранить PDF
        </button>
      </div>
    </section>
  );
}

export function ExportScreen() {
  const { diary } = useDiary();
  const count = diary.entries.filter((e) => e.deletedAt === null).length;
  return (
    <section className="export">
      <div className="page-heading">
        <h1>Экспорт</h1>
        <span className="page-heading-aside">{`${count} ${plural(count, ENTRY_FORMS)}`}</span>
      </div>
      <div className="export-panels">
        <ReportPanel />
        <BackupPanel />
      </div>
    </section>
  );
}
