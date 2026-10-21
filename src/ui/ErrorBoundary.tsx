import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { DIARY_KEY } from '../storage/diaryStore';
import { downloadText } from '../storage/files';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** Saves the stored diary exactly as it is, readable or not. */
function downloadRawDiary(): void {
  try {
    downloadText('kptdiary-raw.json', localStorage.getItem(DIARY_KEY) ?? '', 'application/json');
  } catch (e) {
    console.error('Could not download the stored diary', e);
  }
}

/**
 * Catches render errors from the screens, so a bad stored document never leaves a
 * white screen: the user can still take the raw data out and reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="container">
        <div className="crash" role="alert">
          <h1>Что-то пошло не так</h1>
          <p>Данные не потеряны. Скачайте их и сообщите об ошибке.</p>
          <div className="crash-actions">
            <button type="button" className="button-primary" onClick={downloadRawDiary}>
              Скачать сохранённые данные
            </button>
            <button type="button" className="button-secondary" onClick={() => location.reload()}>
              Перезагрузить
            </button>
          </div>
        </div>
      </main>
    );
  }
}
