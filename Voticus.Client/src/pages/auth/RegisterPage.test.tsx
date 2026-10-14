import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { RegisterPage } from './RegisterPage'
import { ApiError } from '../../api/client'

vi.mock('../../api/auth', () => ({
  register: vi.fn(),
  login: vi.fn(),
  getMe: vi.fn(),
}))

import { register } from '../../api/auth'
const mockedRegister = vi.mocked(register)

describe('RegisterPage', () => {
  // AC-M2
  it('tells a new member that approval is pending after registering', async () => {
    mockedRegister.mockResolvedValue(undefined)
    renderWithProviders(<RegisterPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Passw0rd!')
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText(/waiting for approval/i)).toBeInTheDocument()
  })

  // Field errors from the API sit beside the field.
  it('shows API validation errors beside the field', async () => {
    mockedRegister.mockRejectedValue(
      new ApiError(400, 'Registration failed', '', { password: ['Passwords must have at least one digit.'] }),
    )
    renderWithProviders(<RegisterPage />)

    await userEvent.type(screen.getByLabelText(/email/i), 'new@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'weak')
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))

    expect(await screen.findByText(/at least one digit/i)).toBeInTheDocument()
  })
})
