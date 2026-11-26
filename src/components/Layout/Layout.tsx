import { useRef, useState } from 'react';
import { Link, Outlet, ScrollRestoration } from 'react-router';
import { ReturnTargetsContext } from '@/features/search/returnTargetsContext';
import type { ReturnTargets } from '@/features/search/returnTargetsContext';
import styles from './Layout.module.scss';
import { useRouteFocus } from './useRouteFocus';

function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);
  const [returnTargets] = useState<ReturnTargets>(() => new Map());

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.brand}>
            repo-explorer
          </Link>
        </div>
      </header>
      <main ref={mainRef} className={styles.main}>
        <div className={styles.container}>
          <ReturnTargetsContext value={returnTargets}>
            <Outlet />
          </ReturnTargetsContext>
        </div>
      </main>
      <ScrollRestoration />
    </>
  );
}

export default Layout;
