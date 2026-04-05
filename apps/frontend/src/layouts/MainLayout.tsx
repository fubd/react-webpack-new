import {Suspense} from 'react';
import {Link, NavLink, Outlet} from 'react-router-dom';
import './MainLayout.less';
import pageRoutes from '@/routes/config';
import brandMarkImage from '@/assets/brand-mark.png';

const MainLayout = () => {
  return (
    <div className="layoutRoot">
      <header className="header">
        <div className="headerInner">
          <Link className="brand" to="/">
            <span className="brandMark" aria-hidden="true">
              <img className="brandMarkImage" src={brandMarkImage} alt="" />
            </span>
            <span className="brandText">
              <span className="brandEyebrow">Product Starter</span>
              <span className="brandName">Parrot</span>
            </span>
          </Link>
          <nav className="nav" aria-label="Primary">
            <div className="navRail">
              {pageRoutes
                .filter((route) => route.handle?.nav)
                .map((route) => {
                  const to = route.index ? '/' : `/${route.path ?? ''}`;

                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={route.index === true}
                      className={({isActive}) => `navLink${isActive ? ' navLinkActive' : ''}`}
                    >
                      {route.handle?.title ?? 'Untitled'}
                    </NavLink>
                  );
                })}
            </div>
          </nav>
          <div className="headerMeta">
            <span className="headerMetaDot" aria-hidden="true" />
            <span>React + Hono stack</span>
          </div>
        </div>
      </header>
      <main className="content">
        <div className="contentInner">
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
        </div>
      </main>
      <footer className="footer">
        Parrot ©{new Date().getFullYear()} Frontend, API, MySQL, nginx, and Docker in one branch.
      </footer>
    </div>
  );
};

export default MainLayout;
