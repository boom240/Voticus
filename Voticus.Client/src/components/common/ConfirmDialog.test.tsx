import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { ConfirmDialog } from './ConfirmDialog'

// AC-V7: destructive actions name the consequence and need a confirm click.
describe('ConfirmDialog', () => {
  it('states the consequence and only confirms on the confirm button', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    renderWithProviders(
      <ConfirmDialog
        open
        title="Delete entry?"
        message="This deletes the entry and its votes. It cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Delete entry?' })).toBeInTheDocument()
    expect(screen.getByText(/deletes the entry and its votes/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
