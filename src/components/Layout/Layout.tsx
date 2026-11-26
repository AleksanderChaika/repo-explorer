import { useRef } from 'react';
import { Link, Outlet } from 'react-router';
import styles from './Layout.module.scss';
import { useRouteFocus } from './useRouteFocus';

function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  useRouteFocus(mainRef);

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
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default Layout;
