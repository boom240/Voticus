import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CollectionsIcon from '@mui/icons-material/CollectionsOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { imageUrl } from '../../api/client'
import type { EntryCard as EntryCardData } from '../../types/competition'
import { LazyImage } from '../common/LazyImage'

export interface VoteControlState {
  // Whether the viewer is logged in at all.
  isLoggedIn: boolean
  // Approved and the competition is open and they have not voted yet.
  canVote: boolean
  // Id of the entry the viewer voted for, if any.
  votedEntryId: number | null
  competitionOpen: boolean
}

interface EntryCardProps {
  entry: EntryCardData
  competitionId: number
  vote: VoteControlState
  onVote?: (entry: EntryCardData) => void
  busy?: boolean
}

// 4:3 cover, title, one line excerpt and the vote control. The card body links to the entry.
export function EntryCard({ entry, competitionId, vote, onVote, busy = false }: EntryCardProps) {
  const votedForThis = vote.votedEntryId === entry.id
  const hasVoted = vote.votedEntryId != null

  let label = 'Vote'
  let reason: string | null = null
  let disabled = false

  if (votedForThis) {
    label = 'Your vote'
    disabled = true
  } else if (!vote.competitionOpen) {
    label = 'Voting closed'
    disabled = true
  } else if (!vote.isLoggedIn) {
    label = 'Log in to vote'
    reason = 'Log in with an approved account to vote.'
    disabled = true
  } else if (entry.isMine) {
    label = 'Your entry'
    reason = 'You cannot vote for your own entry.'
    disabled = true
  } else if (hasVoted) {
    label = 'Vote'
    reason = 'You have already voted in this competition.'
    disabled = true
  } else if (!vote.canVote) {
    label = 'Vote'
    reason = 'Only approved members can vote.'
    disabled = true
  }

  const button = (
    <Button
      variant={votedForThis ? 'contained' : 'outlined'}
      color={votedForThis ? 'success' : 'primary'}
      size="small"
      disabled={disabled || busy}
      onClick={() => onVote?.(entry)}
      startIcon={votedForThis ? <CheckCircleIcon /> : undefined}
      aria-label={`${label}: ${entry.title}`}
      sx={{ minWidth: 120 }}
    >
      {label}
    </Button>
  )

  return (
    <Card
      component="article"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderColor: votedForThis ? 'success.main' : undefined,
        borderWidth: votedForThis ? 2 : 1,
      }}
      data-voted={votedForThis || undefined}
    >
      <CardActionArea component={RouterLink} to={`/competitions/${competitionId}/entries/${entry.id}`}>
        {entry.coverImage ? (
          <LazyImage
            src={imageUrl(entry.coverImage.thumbnailKey)}
            alt={entry.coverImage.altText || entry.title}
            placeholder={entry.coverImage.placeholder}
          />
        ) : (
          <Box sx={{ aspectRatio: '4 / 3', bgcolor: 'action.hover' }} aria-hidden />
        )}
        <CardContent sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography variant="h3" component="h2" sx={{ overflowWrap: 'anywhere' }}>
              {entry.title}
            </Typography>
            {entry.imageCount > 1 && (
              <Chip
                size="small"
                icon={<CollectionsIcon />}
                label={entry.imageCount}
                aria-label={`${entry.imageCount} images`}
                variant="outlined"
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
            {entry.excerpt}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {entry.isMine ? 'Your entry' : entry.ownerLabel}
            {entry.voteCount != null && ` · ${entry.voteCount} ${entry.voteCount === 1 ? 'vote' : 'votes'}`}
          </Typography>
        </CardContent>
      </CardActionArea>
      <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, pb: 2, mt: 'auto' }}>
        {reason ? (
          <Tooltip title={reason} enterTouchDelay={0}>
            <span>{button}</span>
          </Tooltip>
        ) : (
          button
        )}
      </Stack>
      {reason && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1.5, mt: -1 }}>
          {reason}
        </Typography>
      )}
    </Card>
  )
}
