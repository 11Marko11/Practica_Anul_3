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
import { AdminCars } from '../pages/admin/AdminCars'
import { AdminCarForm } from '../pages/admin/AdminCarForm'
import { AdminBookings } from '../pages/admin/AdminBookings'
import { AdminPages } from '../pages/admin/AdminPages'
import { AdminDashboard } from '../pages/admin/AdminDashboard'
import { AdminTransactions } from '../pages/admin/AdminTransactions'
import { AdminCustomers } from '../pages/admin/AdminCustomers'
import { AdminReviews } from '../pages/admin/AdminReviews'
import { AdminPromotions } from '../pages/admin/AdminPromotions'
import { MyBookings } from '../pages/MyBookings'
import { BookingDetails } from '../pages/BookingDetails'
import { Profile } from '../pages/Profile'

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
      { path: 'profile', Component: Profile },
      { path: 'bookings', Component: MyBookings },
      { path: 'bookings/:id', Component: BookingDetails },
      { path: 'admin', Component: AdminDashboard },
      { path: 'admin/cars', Component: AdminCars },
      { path: 'admin/bookings', Component: AdminBookings },
      { path: 'admin/pages', Component: AdminPages },
      { path: 'admin/transactions', Component: AdminTransactions },
      { path: 'admin/customers', Component: AdminCustomers },
      { path: 'admin/customers/:id', Component: AdminCustomers },
      { path: 'admin/reviews', Component: AdminReviews },
      { path: 'admin/promotions', Component: AdminPromotions },
      { path: 'admin/promotions/:id', Component: AdminPromotions },
      { path: 'admin/cars/new', Component: AdminCarForm },
      { path: 'admin/cars/:slug', Component: AdminCarForm },
    ],
  },
])
