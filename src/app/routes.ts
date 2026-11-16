import { createBrowserRouter, Navigate, useParams } from 'react-router'
import { createElement } from 'react'
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
import { HostCarForm } from '../pages/HostCarForm'
import { AdminPages } from '../pages/admin/AdminPages'
import { AdminDashboard } from '../pages/admin/AdminDashboard'
import { AdminTransactions } from '../pages/admin/AdminTransactions'
import { AdminUsers } from '../pages/admin/AdminUsers'
import { AdminPromotions } from '../pages/admin/AdminPromotions'
import { HostPanel } from '../pages/HostPanel'
import { HostProfile } from '../pages/HostProfile'
import { MyBookings } from '../pages/MyBookings'
import { BookingDetails } from '../pages/BookingDetails'
import { Profile } from '../pages/Profile'
import { Notifications } from '../pages/Notifications'

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
      { path: 'notifications', Component: Notifications },
      { path: 'bookings', Component: MyBookings },
      { path: 'bookings/:id', Component: BookingDetails },
      { path: 'admin', Component: AdminDashboard },
      { path: 'admin/cars', Component: AdminCars },
      { path: 'admin/users', Component: AdminUsers },
      { path: 'admin/users/host/:hostId', Component: AdminUsers },
      { path: 'admin/users/:id', Component: AdminUsers },
      { path: 'admin/hosts', Component: () => createElement(Navigate, { to: '/admin/users?role=host', replace: true }) },
      { path: 'host', Component: HostPanel },
      { path: 'hosts/:id', Component: HostProfile },
      { path: 'host/cars/new', Component: HostCarForm },
      { path: 'host/cars/:id', Component: HostCarForm },
      { path: 'admin/bookings', Component: () => createElement(Navigate, { to: '/admin', replace: true }) },
      { path: 'admin/pages', Component: AdminPages },
      { path: 'admin/transactions', Component: AdminTransactions },
      { path: 'admin/customers', Component: () => createElement(Navigate, { to: '/admin/users', replace: true }) },
      { path: 'admin/customers/:id', Component: OldCustomerLink },
      { path: 'admin/reviews', Component: () => createElement(Navigate, { to: '/admin', replace: true }) },
      { path: 'admin/promotions', Component: AdminPromotions },
      { path: 'admin/promotions/:id', Component: AdminPromotions },
    ],
  },
])

// Old addresses of a customer's page now open the same user under /admin/users.
function OldCustomerLink() {
  const { id } = useParams()
  return createElement(Navigate, { to: `/admin/users/${id}`, replace: true })
}
