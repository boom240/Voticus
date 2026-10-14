import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../test/render'
import { ResultsPage } from './ResultsPage'
import type { ResultEntry, Results } from '../api/results'

vi.mock('../api/results', () => ({
  getResults: vi.fn(),
}))

import { getResults } from '../api/results'
const mocked = vi.mocked(getResults)

function entry(id: number, title: string, votes: number, share: number, isWinner: boolean): ResultEntry {
  return { entryId: id, title, ownerLabel: `Entrant ${id}`, coverImage: null, votes, sharePercent: share, isWinner }
}

const closedResults: Results = {
  competitionId: 2,
  title: 'Summer skies',
  status: 'Closed',
  endsAtUtc: '2026-10-10T17:00:00Z',
  available: true,
  totalVotes: 5,
  entryCount: 3,
  approvedMembers: 10,
  turnoutPercent: 50,
  winners: [entry(1, 'Storm front', 2, 40, true), entry(2, 'Pink evening', 2, 40, true)],
  entries: [entry(1, 'Storm front', 2, 40, true), entry(2, 'Pink evening', 2, 40, true), entry(3, 'Clear blue', 1, 20, false)],
  timeline: [
    { atUtc: '2026-10-01T10:00:00Z', cumulativeVotes: 1 },
    { atUtc: '2026-10-02T10:00:00Z', cumulativeVotes: 2 },
  ],
}

describe('ResultsPage', () => {
  beforeEach(() => mocked.mockReset())

  // AC-R1
  it('says when results will be available while the competition is open', async () => {
    mocked.mockResolvedValue({ ...closedResults, status: 'Open', available: false, winners: [], entries: [], timeline: [], totalVotes: 0 })
    renderWithProviders(<ResultsPage />, { route: '/competitions/2/results' })

    expect(await screen.findByText('Results are not out yet')).toBeInTheDocument()
    expect(screen.getByText(/Results are shown after/)).toBeInTheDocument()
  })

  // AC-R2
  it('shows tied entries as joint winners', async () => {
    mocked.mockResolvedValue(closedResults)
    renderWithProviders(<ResultsPage />, { route: '/competitions/2/results' })

    expect(await screen.findByRole('heading', { name: 'Joint winners' })).toBeInTheDocument()
    expect(screen.getAllByText('Joint winner')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Storm front', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pink evening', level: 3 })).toBeInTheDocument()
  })

  // AC-R3 and AC-R4: each chart has a table whose figures match the data
  it('renders a text table under each chart with matching figures', async () => {
    mocked.mockResolvedValue(closedResults)
    renderWithProviders(<ResultsPage />, { route: '/competitions/2/results' })

    const votesTable = await screen.findByRole('table', { name: /votes per entry, as a table/i })
    expect(votesTable).toHaveTextContent('Storm front (winner)')
    expect(votesTable).toHaveTextContent('Clear blue')

    const shareTable = screen.getByRole('table', { name: /share of votes, as a table/i })
    expect(shareTable).toHaveTextContent('40.0%')
    expect(shareTable).toHaveTextContent('20.0%')
    expect(shareTable).toHaveTextContent('Total5100%')

    const timelineTable = screen.getByRole('table', { name: /votes over time, as a table/i })
    expect(timelineTable).toHaveTextContent('2')

    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('5 of 10 approved members voted')).toBeInTheDocument()
  })
})
