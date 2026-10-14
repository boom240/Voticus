import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import type { CompetitionSummary } from '../../types/competition'
import { StatusChip } from '../common/StatusChip'
import { LocalTime } from '../common/LocalTime'
import { Countdown } from '../common/Countdown'

export function CompetitionCard({ competition }: { competition: CompetitionSummary }) {
  const entries = competition.entryCount === 1 ? '1 entry' : `${competition.entryCount} entries`

  return (
    <Card component="article">
      <CardActionArea component={RouterLink} to={`/competitions/${competition.id}`} sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography variant="h3" component="h2" sx={{ overflowWrap: 'anywhere' }}>
              {competition.title}
            </Typography>
            <StatusChip status={competition.status} />
          </Stack>
          {competition.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {competition.description}
            </Typography>
          )}
          <Stack spacing={0.25} sx={{ mt: 'auto', pt: 1 }}>
            <Typography variant="body2">{entries}</Typography>
            {competition.status === 'Open' && (
              <Countdown target={competition.endsAtUtc} variant="body2" color="text.secondary" />
            )}
            {competition.status === 'Upcoming' && (
              <Countdown target={competition.startsAtUtc} prefix="Opens in" variant="body2" color="text.secondary" />
            )}
            <LocalTime
              value={competition.endsAtUtc}
              prefix={competition.status === 'Closed' ? 'Closed' : 'Closes'}
              variant="caption"
              color="text.secondary"
            />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
