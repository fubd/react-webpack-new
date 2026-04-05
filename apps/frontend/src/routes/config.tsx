import {lazy} from 'react';
import type {RouteObject} from 'react-router-dom';

const HomePage = lazy(() => import('@/pages/home'));
const AboutPage = lazy(() => import('@/pages/about'));
const NewsPage = lazy(() => import('@/pages/news'));

const pageRoutes = [
  {
    index: true,
    handle: {
      title: 'Home',
      nav: true,
    },
    element: <HomePage />,
  },
  {
    path: 'about',
    handle: {
      title: 'About',
      nav: true,
    },
    element: <AboutPage />,
  },
  {
    path: 'news',
    handle: {
      title: 'News',
      nav: true,
    },
    element: <NewsPage />,
  },
  {
    path: '*',
    element: (
      <div style={{padding: '80px 0', textAlign: 'center'}}>
        <h1 style={{fontSize: 64, margin: 0}}>404</h1>
        <p style={{color: '#999', margin: '8px 0 0'}}>Page not found</p>
      </div>
    ),
  },
] satisfies RouteObject[];

export default pageRoutes;
