import {Menu, theme} from 'antd';
import {Outlet, useLocation, useNavigate} from 'react-router-dom';
import './MainLayout.less';
import routes from '@/routes';

const MENU_ITEMS = routes.map((r) => ({key: r.path, label: r.label}));

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {token} = theme.useToken();

  return (
    <div style={{minHeight: '100vh', background: token.colorBgLayout, display: 'flex', flexDirection: 'column'}}>
      <header className="header">
        <div className="logo" onClick={() => navigate('/')}>
          Dot SaaS
        </div>
        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={MENU_ITEMS}
          onClick={(e) => navigate(e.key)}
          className="menu"
        />
      </header>
      <main className="content">
        <div className="contentInner">
          <Outlet />
        </div>
      </main>
      <footer className="footer">
        Dot SaaS ©{new Date().getFullYear()} Designed by Antigravity
      </footer>
    </div>
  );
};

export default MainLayout;
