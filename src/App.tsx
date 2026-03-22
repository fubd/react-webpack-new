import React from 'react';
import {ConfigProvider} from 'antd';
import {BrowserRouter, useRoutes} from 'react-router-dom';
import 'antd/dist/reset.css';
import './styles/global.less';
import antdTheme from './theme/antdTheme';
import routes from './routes';

const AppRouter = () => useRoutes(routes);

const App: React.FC = () => {
  return (
    <ConfigProvider theme={antdTheme}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
