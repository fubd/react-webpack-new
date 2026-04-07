import {Suspense, useEffect} from 'react';
import {Link, NavLink, Outlet, useLocation} from 'react-router-dom';
import {ErrorBoundary} from '../components/ErrorBoundary';
import styles from './MainLayout.module.less';
import pageRoutes from '@/routes/config';
import brandMarkImage from '@/assets/brand-mark.png';

const CURRENT_YEAR = new Date().getFullYear();

const MainLayout = () => {
  const location = useLocation();

  useEffect(() => {
    const current = pageRoutes.find((r) => {
      if (r.index) return location.pathname === '/';
      return location.pathname === `/${r.path}`;
    });
    document.title = current?.handle?.title ? `${current.handle.title} — Parrot` : 'Parrot';
  }, [location.pathname]);

  return (
    <div className={styles.layoutRoot}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} to="/">
            <span className={styles.brandMark} aria-hidden="true">
              <img className={styles.brandMarkImage} src={brandMarkImage} alt="" />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandEyebrow}>Product Starter</span>
              <span className={styles.brandName}>Parrot</span>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            <div className={styles.navRail}>
              {pageRoutes
                .filter((route) => route.handle?.nav)
                .map((route) => {
                  const to = route.index ? '/' : `/${route.path ?? ''}`;

                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={route.index === true}
                      className={({isActive}) => `${styles.navLink}${isActive ? ` ${styles.navLinkActive}` : ''}`}
                    >
                      {route.handle?.title ?? 'Untitled'}
                    </NavLink>
                  );
                })}
            </div>
          </nav>
          <div className={styles.headerMeta}>
            <span className={styles.headerMetaDot} aria-hidden="true" />
            <span>React + Hono stack</span>
          </div>
        </div>
      </header>
      <main className={styles.content}>
        <div className={styles.contentInner}>
          <ErrorBoundary>
            <Suspense
              fallback={(
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: 48,
                    color: 'var(--dot-color-text-secondary)',
                  }}
                >
                  Loading...
                </div>
              )}
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <footer className={styles.footer}>
        Parrot &copy;{CURRENT_YEAR} Frontend, API, MySQL, nginx, and Docker in one branch.
      </footer>
    </div>
  );
};

export default MainLayout;
