import {lazy, type LazyExoticComponent, type ComponentType} from 'react';

export interface RouteConfig {
  path: string;
  label: string;
  element: LazyExoticComponent<ComponentType>;
}

const routes: RouteConfig[] = [
  {
    path: '/',
    label: 'Home',
    element: lazy(() => import('@/pages/home')),
  },
  {
    path: '/about',
    label: 'About',
    element: lazy(() => import('@/pages/about')),
  },
  {
    path: '/news',
    label: 'News',
    element: lazy(() => import('@/pages/news')),
  },
];

export default routes;
