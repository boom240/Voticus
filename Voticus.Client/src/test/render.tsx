import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ColorModeProvider } from '../theme/ColorModeContext'
import { ToastProvider } from '../components/common/ToastProvider'
import { AuthProvider, type AuthUser } from '../context/AuthContext'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  user?: AuthUser | null
  route?: string
}

export const approvedUser: AuthUser = {
  id: 'u-approved',
  email: 'approved@example.com',
  roles: ['Approved'],
  isApproved: true,
  isAdmin: false,
}

export const memberUser: AuthUser = {
  id: 'u-member',
  email: 'member@example.com',
  roles: [],
  isApproved: false,
  isAdmin: false,
}

export const adminUser: AuthUser = {
  id: 'u-admin',
  email: 'admin@example.com',
  roles: ['Approved', 'Admin'],
  isApproved: true,
  isAdmin: true,
}

// Renders with the same providers the app uses. Pass user to fix the auth state.
export function renderWithProviders(ui: ReactElement, { user = null, route = '/', ...options }: Options = {}) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ColorModeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[route]}>
            <AuthProvider initialUser={user}>{children}</AuthProvider>
          </MemoryRouter>
        </ToastProvider>
      </ColorModeProvider>
    ),
    ...options,
  })
}
