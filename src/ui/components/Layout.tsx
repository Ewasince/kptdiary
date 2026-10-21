import type { ReactNode } from 'react';
import type { Route } from '../router';
import { useDiary } from '../useDiary';
import { useIsDesktop } from '../useMediaQuery';
import { useNewEntry } from '../useNewEntry';
import { ExportIcon, ListIcon, PlusIcon } from './Icons';

const NAV_ITEMS = [
  { label: 'Записи', href: '#/', section: 'list', Icon: ListIcon },
  { label: 'Экспорт', href: '#/export', section: 'export', Icon: ExportIcon },
] as const;

/** The nav section a route belongs to; the entry editor is part of «Записи». */
function sectionOf(route: Route): 'list' | 'export' {
  return route.name === 'export' ? 'export' : 'list';
}

function Nav({ route, className }: { route: Route; className: string }) {
  const current = sectionOf(route);
  return (
    <nav className={className}>
      {NAV_ITEMS.map((item) => (
        <a
          key={item.section}
          href={item.href}
          aria-current={item.section === current ? 'page' : undefined}
        >
          <item.Icon />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

function Banners() {
  const { corrupted, saveError } = useDiary();
  return (
    <>
      {corrupted && (
        <p role="alert" className="banner">
          Не удалось прочитать сохранённые данные. Импортируйте бэкап на экране «Экспорт».
        </p>
      )}
      {saveError?.kind === 'quota' && (
        <p role="alert" className="banner">
          Не удалось сохранить, место закончилось. Сделайте бэкап.
        </p>
      )}
      {saveError?.kind === 'unknown' && (
        <p role="alert" className="banner">
          Не удалось сохранить данные. Сделайте бэкап.
        </p>
      )}
    </>
  );
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const isDesktop = useIsDesktop();
  const onNew = useNewEntry();

  if (isDesktop) {
    return (
      <div className="layout layout-desktop">
        <header className="topbar">
          <div className="topbar-inner">
            <span className="app-name">КПТ-дневник</span>
            <Nav route={route} className="topbar-nav" />
            <button type="button" className="button-primary button-icon" onClick={onNew}>
              <PlusIcon />
              Новая запись
            </button>
          </div>
        </header>
        <main className="container">
          <Banners />
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="layout layout-phone">
      <main className="container">
        <Banners />
        {children}
      </main>
      <Nav route={route} className="bottom-nav" />
    </div>
  );
}
