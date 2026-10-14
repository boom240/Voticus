import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import { CompetitionListPage } from './CompetitionListPage'
import type { CompetitionSummary } from '../types/competition'

vi.mock('../api/competitions', () => ({
  getCompetitions: vi.fn(),
}))

import { getCompetitions } from '../api/competitions'
const mocked = vi.mocked(getCompetitions)

const open: CompetitionSummary = {
  id: 1,
  title: 'Autumn light',
  description: 'Season',
  status: 'Open',
  startsAtUtc: '2026-10-01T00:00:00Z',
  endsAtUtc: '2099-10-20T00:00:00Z',
  entryCount: 3,
}
const closed: CompetitionSummary = {
  ...open,
  id: 2,
  title: 'Summer skies',
  status: 'Closed',
  endsAtUtc: '2026-10-01T00:00:00Z',
  entryCount: 1,
}

describe('CompetitionListPage', () => {
  beforeEach(() => mocked.mockReset())

  // AC-V4: skeleton while loading
  it('shows skeleton placeholders while loading', async () => {
    let resolve: (value: CompetitionSummary[]) => void = () => {}
    mocked.mockReturnValue(new Promise<CompetitionSummary[]>((r) => (resolve = r)))
    renderWithProviders(<CompetitionListPage />)

    expect(screen.getAllByTestId('card-skeleton').length).toBeGreaterThan(0)

    await act(async () => resolve([]))
    expect(screen.queryByTestId('card-skeleton')).not.toBeInTheDocument()
  })

  // AC-V4: designed empty state
  it('shows an empty state when there are no competitions', async () => {
    mocked.mockResolvedValue([])
    renderWithProviders(<CompetitionListPage />)
    expect(await screen.findByText('No competitions yet')).toBeInTheDocument()
  })

  // AC-A1: grouped list
  it('groups competitions by status', async () => {
    mocked.mockResolvedValue([open, closed])
    renderWithProviders(<CompetitionListPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Autumn light' })).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Open', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Closed', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Summer skies' })).toBeInTheDocument()
    expect(screen.getByText('3 entries')).toBeInTheDocument()
    expect(screen.getByText('1 entry')).toBeInTheDocument()
  })
})
