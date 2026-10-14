import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { EntryCard, type VoteControlState } from './EntryCard'
import type { EntryCard as EntryCardData } from '../../types/competition'

const entry: EntryCardData = {
  id: 7,
  title: 'Golden hour',
  excerpt: 'Light on the canal.',
  ownerLabel: 'Entrant 1',
  isMine: false,
  coverImage: {
    id: 1,
    position: 0,
    key: 'abc.jpg',
    thumbnailKey: 'abc_t.jpg',
    placeholder: 'data:image/jpeg;base64,AAAA',
    altText: 'Golden hour',
    width: 1200,
    height: 900,
    contentType: 'image/jpeg',
  },
  imageCount: 3,
  voteCount: null,
}

const anonymous: VoteControlState = { isLoggedIn: false, canVote: false, votedEntryId: null, competitionOpen: true }
const approved: VoteControlState = { isLoggedIn: true, canVote: true, votedEntryId: null, competitionOpen: true }

describe('EntryCard', () => {
  // AC-A3
  it('shows a disabled vote button with a log in prompt for anonymous users', () => {
    renderWithProviders(<EntryCard entry={entry} competitionId={1} vote={anonymous} />)

    const button = screen.getByRole('button', { name: /log in to vote/i })
    expect(button).toBeDisabled()
    expect(screen.getByText(/log in with an approved account to vote/i)).toBeInTheDocument()
  })

  // AC-P2
  it('gives the cover image alt text', () => {
    renderWithProviders(<EntryCard entry={entry} competitionId={1} vote={anonymous} />)
    expect(screen.getByRole('img', { name: 'Golden hour' })).toBeInTheDocument()
  })

  // AC-M7 (UI side)
  it('disables voting on the viewer\'s own entry', () => {
    renderWithProviders(<EntryCard entry={{ ...entry, isMine: true }} competitionId={1} vote={approved} />)

    expect(screen.getByRole('button', { name: /your entry/i })).toBeDisabled()
    expect(screen.getByText(/cannot vote for your own entry/i)).toBeInTheDocument()
  })

  // AC-M8
  it('marks the chosen entry and disables the others after voting', () => {
    const voted: VoteControlState = { ...approved, canVote: false, votedEntryId: 7 }
    const { unmount } = renderWithProviders(<EntryCard entry={entry} competitionId={1} vote={voted} />)
    expect(screen.getByRole('button', { name: /your vote/i })).toBeDisabled()
    unmount()

    renderWithProviders(<EntryCard entry={{ ...entry, id: 8, title: 'Other' }} competitionId={1} vote={voted} />)
    expect(screen.getByRole('button', { name: /^vote: Other/i })).toBeDisabled()
    expect(screen.getByText(/already voted/i)).toBeInTheDocument()
  })

  it('calls onVote when an approved member clicks Vote', async () => {
    const onVote = vi.fn()
    renderWithProviders(<EntryCard entry={entry} competitionId={1} vote={approved} onVote={onVote} />)

    await userEvent.click(screen.getByRole('button', { name: /^vote: Golden hour/i }))
    expect(onVote).toHaveBeenCalledWith(entry)
  })
})
