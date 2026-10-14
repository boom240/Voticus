import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { StatusChip } from './StatusChip'
import type { CompetitionStatus } from '../../theme/tokens'

// AC-V5: chips carry text as well as colour.
describe('StatusChip', () => {
  it.each<CompetitionStatus>(['Draft', 'Upcoming', 'Open', 'Closed'])('shows the %s label as text', (status) => {
    renderWithProviders(<StatusChip status={status} />)
    expect(screen.getByText(status)).toBeInTheDocument()
  })
})
