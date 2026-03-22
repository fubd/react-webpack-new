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
] satisfies RouteObject[];

export default pageRoutes;
