import type {RouteObject} from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import pageRoutes from './config';

const routes = [
  {
    path: '/',
    element: <MainLayout />,
    children: pageRoutes,
  },
] satisfies RouteObject[];

export default routes;
