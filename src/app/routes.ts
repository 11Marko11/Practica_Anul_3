import { createBrowserRouter } from 'react-router'
import { Root } from './Root'
import { Home } from '../pages/Home'
import { Marketplace } from '../pages/Marketplace'
import { About } from '../pages/About'
import { Contact } from '../pages/Contact'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'marketplace', Component: Marketplace },
      { path: 'about', Component: About },
      { path: 'contact', Component: Contact },
    ],
  },
])
