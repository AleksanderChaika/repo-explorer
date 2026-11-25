import { Fragment } from 'react';
import type { RouteObject } from 'react-router';
import Layout from '@/components/Layout/Layout';
import { searchLoader } from '@/features/search/searchLoader';
import HomePage from '@/pages/HomePage/HomePage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: HomePage,
        loader: searchLoader,
        HydrateFallback: Fragment,
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];
