import { RouterProvider } from 'react-router'
import { router } from './app/routes'
import { AuthProvider } from './auth/AuthContext'
import { I18nProvider } from './i18n/I18nContext'

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nProvider>
  )
}
