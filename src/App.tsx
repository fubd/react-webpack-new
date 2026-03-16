import React, {Suspense} from 'react';
import {ConfigProvider, Spin} from 'antd';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import 'antd/dist/reset.css';
import './styles/global.less';
import antdTheme from './theme/antdTheme';
import MainLayout from './layouts/MainLayout';
import routes from './routes';

const App: React.FC = () => {
  return (
    <ConfigProvider theme={antdTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {routes.map((route) => {
              const Page = route.element;
              return (
                <Route
                  key={route.path}
                  index={route.path === '/'}
                  path={route.path === '/' ? undefined : route.path.slice(1)}
                  element={
                    <Suspense fallback={<Spin style={{display: 'flex', justifyContent: 'center', padding: 48}} />}>
                      <Page />
                    </Suspense>
                  }
                />
              );
            })}
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
