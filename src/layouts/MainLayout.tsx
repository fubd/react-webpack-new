import React from 'react';
import {Menu, theme} from 'antd';
import {Outlet, useLocation, useNavigate} from 'react-router-dom';
import './MainLayout.less';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {cssVar, token} = theme.useToken();
  console.log(cssVar);

  const menuItems = [
    {
      key: '/',
      label: 'Home',
    },
    {
      key: '/about',
      label: 'About',
    },
    {
      key: '/news',
      label: 'News',
    },
  ];

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
          items={menuItems}
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
