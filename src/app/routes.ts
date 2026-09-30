import { createBrowserRouter } from 'react-router'
import { Root } from './Root'
import { Home } from '../pages/Home'
import { Marketplace } from '../pages/Marketplace'
import { About } from '../pages/About'
export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'marketplace', Component: Marketplace },
      { path: 'about', Component: About },
    ],
  },
])
