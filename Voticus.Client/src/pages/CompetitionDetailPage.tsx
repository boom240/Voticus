import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getCompetition } from '../api/competitions'
import { castVote } from '../api/votes'
import { errorMessage } from '../api/client'
import { CardGrid } from '../components/common/CardGrid'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Countdown } from '../components/common/Countdown'
import { EmptyState } from '../components/common/EmptyState'
import { LocalTime } from '../components/common/LocalTime'
import { PageHeader } from '../components/common/PageHeader'
import { CardGridSkeleton, PageHeaderSkeleton } from '../components/common/Skeletons'
import { StatusChip } from '../components/common/StatusChip'
import { useToast } from '../components/common/ToastProvider'
import { EntryCard } from '../components/competitions/EntryCard'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import type { EntryCard as EntryCardData } from '../types/competition'

export function CompetitionDetailPage() {
  const { id } = useParams()
  const competitionId = Number(id)
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => getCompetition(competitionId), [competitionId])
  const [pendingVote, setPendingVote] = useState<EntryCardData | null>(null)
  const [voting, setVoting] = useState(false)

  if (loading) {
    return (
      <>
        <PageHeaderSkeleton />
        <CardGridSkeleton count={6} />
      </>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Competition not found"
        description={error ? errorMessage(error) : undefined}
        action={{ label: 'Back to competitions', to: '/' }}
      />
    )
  }

  const competition = data
  const isOpen = competition.status === 'Open'

  const confirmVote = async () => {
    if (!pendingVote) return
    setVoting(true)
    try {
      await castVote(competition.id, pendingVote.id)
      setData((prev) => ({ ...prev, myVoteEntryId: pendingVote.id, canVote: false }))
      showToast(`Vote cast for "${pendingVote.title}".`)
      setPendingVote(null)
    } catch (err) {
      showToast(errorMessage(err, 'Could not cast your vote.'), 'error')
      reload()
    } finally {
      setVoting(false)
    }
  }

  const timing = (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
      {competition.status === 'Upcoming' && (
        <LocalTime value={competition.startsAtUtc} prefix="Opens" variant="body2" />
      )}
      <LocalTime value={competition.endsAtUtc} prefix={competition.status === 'Closed' ? 'Closed' : 'Closes'} variant="body2" />
      {isOpen && <Countdown target={competition.endsAtUtc} variant="body2" sx={{ fontWeight: 500 }} />}
      {competition.status === 'Upcoming' && (
        <Countdown target={competition.startsAtUtc} prefix="Opens in" variant="body2" sx={{ fontWeight: 500 }} />
      )}
    </Stack>
  )

  const actions = (
    <>
      {competition.resultsAvailable && (
        <Button variant="contained" component={RouterLink} to={`/competitions/${competition.id}/results`}>
          Results
        </Button>
      )}
      {competition.canEnter && (
        <Button variant="contained" component={RouterLink} to={`/competitions/${competition.id}/enter`}>
          Enter
        </Button>
      )}
      {competition.myEntryId != null && isOpen && (
        <Button
          variant="outlined"
          component={RouterLink}
          to={`/competitions/${competition.id}/entries/${competition.myEntryId}/edit`}
        >
          Edit my entry
        </Button>
      )}
    </>
  )

  return (
    <>
      <PageHeader
        title={competition.title}
        chips={<StatusChip status={competition.status} size="medium" />}
        subtitle={timing}
        actions={actions}
      />

      {competition.description && (
        <Typography variant="body1" sx={{ mb: 3, maxWidth: 720, whiteSpace: 'pre-line' }}>
          {competition.description}
        </Typography>
      )}

      {user && !user.isApproved && isOpen && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your account is waiting for approval. Once an admin approves you, you can enter and vote.
        </Alert>
      )}
      {!user && isOpen && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <RouterLink to="/login">Log in</RouterLink> with an approved account to enter or vote.
        </Alert>
      )}
      {competition.status === 'Closed' && !competition.resultsAvailable && (
        <Alert severity="info" sx={{ mb: 3 }}>
          This competition has closed.
        </Alert>
      )}

      <Typography variant="h2" component="h2" sx={{ mb: 2 }}>
        Entries
      </Typography>

      {competition.entries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          description={competition.canEnter ? 'Be the first to enter.' : isOpen ? 'Entries will appear here as members submit them.' : undefined}
          action={competition.canEnter ? { label: 'Enter now', to: `/competitions/${competition.id}/enter` } : undefined}
        />
      ) : (
        <CardGrid>
          {competition.entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              competitionId={competition.id}
              vote={{
                isLoggedIn: user != null,
                canVote: competition.canVote,
                votedEntryId: competition.myVoteEntryId,
                competitionOpen: isOpen,
              }}
              onVote={setPendingVote}
              busy={voting}
            />
          ))}
        </CardGrid>
      )}

      <ConfirmDialog
        open={pendingVote != null}
        title={`Vote for "${pendingVote?.title}"?`}
        message="You can only vote once in this competition. Your vote is final once cast."
        confirmLabel="Cast vote"
        busy={voting}
        onConfirm={confirmVote}
        onCancel={() => setPendingVote(null)}
      />
    </>
  )
}
