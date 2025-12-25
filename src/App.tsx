import React from 'react';
import {ConfigProvider} from 'antd';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import 'antd/dist/reset.css';
import './styles/global.less'; // Import global styles
import antdTheme from './theme/antdTheme'; // Import custom theme
import MainLayout from './layouts/MainLayout';
import Home from './pages/home';
import About from './pages/about';
import News from './pages/news';

const App: React.FC = () => {
  return (
    <ConfigProvider theme={antdTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="news" element={<News />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
