import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { getEntry } from '../api/competitions'
import { deleteEntry } from '../api/entries'
import { castVote } from '../api/votes'
import { errorMessage } from '../api/client'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { DetailSkeleton } from '../components/common/Skeletons'
import { StatusChip } from '../components/common/StatusChip'
import { useToast } from '../components/common/ToastProvider'
import { ImageGallery } from '../components/competitions/ImageGallery'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'

export function EntryDetailPage() {
  const { id, entryId } = useParams()
  const competitionId = Number(id)
  const entryNumber = Number(entryId)
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { data, loading, error, setData, reload } = useAsync(
    () => getEntry(competitionId, entryNumber),
    [competitionId, entryNumber],
  )
  const [confirmVote, setConfirmVote] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading) return <DetailSkeleton />
  if (error || !data) {
    return (
      <EmptyState
        title="Entry not found"
        description={error ? errorMessage(error) : undefined}
        action={{ label: 'Back to competition', to: `/competitions/${competitionId}` }}
      />
    )
  }

  const entry = data
  const isOpen = entry.competitionStatus === 'Open'
  const votedForThis = entry.myVoteEntryId === entry.id

  const handleVote = async () => {
    setBusy(true)
    try {
      await castVote(entry.competitionId, entry.id)
      setData((prev) => ({ ...prev, myVoteEntryId: entry.id, canVote: false }))
      showToast(`Vote cast for "${entry.title}".`)
      setConfirmVote(false)
    } catch (err) {
      showToast(errorMessage(err, 'Could not cast your vote.'), 'error')
      reload()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await deleteEntry(entry.competitionId, entry.id)
      showToast('Entry deleted.')
      navigate(`/competitions/${entry.competitionId}`)
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete the entry.'), 'error')
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  let voteLabel = 'Vote for this entry'
  let voteDisabled = false
  let voteHint: string | null = null
  if (votedForThis) {
    voteLabel = 'Your vote'
    voteDisabled = true
  } else if (!isOpen) {
    voteLabel = 'Voting closed'
    voteDisabled = true
  } else if (!user) {
    voteLabel = 'Log in to vote'
    voteDisabled = true
    voteHint = 'Log in with an approved account to vote.'
  } else if (entry.isMine) {
    voteLabel = 'Your entry'
    voteDisabled = true
    voteHint = 'You cannot vote for your own entry.'
  } else if (entry.myVoteEntryId != null) {
    voteDisabled = true
    voteHint = 'You have already voted in this competition.'
  } else if (!entry.canVote) {
    voteDisabled = true
    voteHint = 'Only approved members can vote.'
  }

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }} aria-label="Breadcrumb">
        <Link component={RouterLink} to="/">
          Competitions
        </Link>
        <Link component={RouterLink} to={`/competitions/${entry.competitionId}`}>
          {entry.competitionTitle}
        </Link>
        <Typography color="text.primary">{entry.title}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' }, alignItems: 'start' }}>
        <ImageGallery key={entry.id} images={entry.images} title={entry.title} />

        <Stack spacing={2} component="section" aria-label="Entry details">
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
              {entry.title}
            </Typography>
            <StatusChip status={entry.competitionStatus} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            By {entry.isMine ? 'you' : entry.ownerLabel}
            {entry.voteCount != null && ` · ${entry.voteCount} ${entry.voteCount === 1 ? 'vote' : 'votes'}`}
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {entry.description}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant={votedForThis ? 'contained' : 'outlined'}
              color={votedForThis ? 'success' : 'primary'}
              disabled={voteDisabled || busy}
              onClick={() => setConfirmVote(true)}
            >
              {voteLabel}
            </Button>
            {entry.canEdit && (
              <>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to={`/competitions/${entry.competitionId}/entries/${entry.id}/edit`}
                >
                  Edit
                </Button>
                <Button variant="outlined" color="error" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </>
            )}
          </Stack>
          {voteHint && (
            <Typography variant="caption" color="text.secondary">
              {voteHint}
            </Typography>
          )}
        </Stack>
      </Box>

      <ConfirmDialog
        open={confirmVote}
        title={`Vote for "${entry.title}"?`}
        message="You can only vote once in this competition. Your vote is final once cast."
        confirmLabel="Cast vote"
        busy={busy}
        onConfirm={handleVote}
        onCancel={() => setConfirmVote(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        message="This deletes the entry, its images and any votes it has received. It cannot be undone."
        confirmLabel="Delete entry"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
