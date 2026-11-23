import { Link, Outlet } from 'react-router';
import styles from './Layout.module.scss';

function Layout() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link to="/" className={styles.brand}>
            repo-explorer
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.container}>
          <Outlet />
        </div>
      </main>
    </>
  );
}

export default Layout;
