import { createBrowserRouter } from 'react-router'
import { Root } from './Root'
import { Home } from '../pages/Home'
import { Marketplace } from '../pages/Marketplace'
import { CarDetails } from '../pages/CarDetails'
import { About } from '../pages/About'
import { Contact } from '../pages/Contact'
import { Login } from '../pages/Login'
import { Terms } from '../pages/Terms'
import { Privacy } from '../pages/Privacy'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'marketplace', Component: Marketplace },
      { path: 'cars/:slug', Component: CarDetails },
      { path: 'about', Component: About },
      { path: 'contact', Component: Contact },
      { path: 'login', Component: Login },
      { path: 'terms', Component: Terms },
      { path: 'privacy', Component: Privacy },
    ],
  },
])
