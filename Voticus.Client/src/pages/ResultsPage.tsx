import { Link as RouterLink, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { getResults, type ResultEntry } from '../api/results'
import { errorMessage, imageUrl } from '../api/client'
import { CardGrid } from '../components/common/CardGrid'
import { EmptyState } from '../components/common/EmptyState'
import { LazyImage } from '../components/common/LazyImage'
import { LocalTime } from '../components/common/LocalTime'
import { PageHeader } from '../components/common/PageHeader'
import { CardGridSkeleton, PageHeaderSkeleton } from '../components/common/Skeletons'
import { StatusChip } from '../components/common/StatusChip'
import { ShareDonut, VotesBarChart, VotesTimeline } from '../components/results/ResultsCharts'
import { useAsync } from '../hooks/useAsync'

export function ResultsPage() {
  const { id } = useParams()
  const competitionId = Number(id)
  const { data, loading, error } = useAsync(() => getResults(competitionId), [competitionId])

  if (loading) {
    return (
      <>
        <PageHeaderSkeleton />
        <CardGridSkeleton count={2} />
      </>
    )
  }
  if (error || !data) {
    return <EmptyState title="Results not found" description={error ? errorMessage(error) : undefined} action={{ label: 'Back to competitions', to: '/' }} />
  }

  const results = data

  if (!results.available) {
    return (
      <>
        <PageHeader title={results.title} chips={<StatusChip status={results.status} size="medium" />} subtitle="Results" />
        <EmptyState
          title="Results are not out yet"
          description={`Results are shown after ${formatEnd(results.endsAtUtc)}.`}
          action={{ label: 'Back to competition', to: `/competitions/${results.competitionId}` }}
        />
      </>
    )
  }

  const winners = results.winners

  return (
    <>
      <Breadcrumbs sx={{ mb: 2 }} aria-label="Breadcrumb">
        <Link component={RouterLink} to="/">
          Competitions
        </Link>
        <Link component={RouterLink} to={`/competitions/${results.competitionId}`}>
          {results.title}
        </Link>
        <Typography color="text.primary">Results</Typography>
      </Breadcrumbs>

      <PageHeader
        title={results.title}
        chips={<StatusChip status={results.status} size="medium" />}
        subtitle={<LocalTime value={results.endsAtUtc} prefix="Closed" variant="body2" />}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        <Stat label="Votes cast" value={String(results.totalVotes)} />
        <Stat label="Entries" value={String(results.entryCount)} />
        <Stat
          label="Turnout"
          value={results.turnoutPercent != null ? `${results.turnoutPercent.toFixed(1)}%` : 'n/a'}
          hint={results.approvedMembers != null ? `${results.totalVotes} of ${results.approvedMembers} approved members voted` : undefined}
        />
      </Stack>

      <Box component="section" aria-labelledby="winners-heading" sx={{ mb: 5 }}>
        <Typography variant="h2" component="h2" id="winners-heading" sx={{ mb: 2 }}>
          {winners.length > 1 ? 'Joint winners' : winners.length === 1 ? 'Winner' : 'No winner'}
        </Typography>
        {winners.length === 0 ? (
          <Typography color="text.secondary">No votes were cast, so there is no winner.</Typography>
        ) : (
          <CardGrid>
            {winners.map((w) => (
              <WinnerCard key={w.entryId} entry={w} competitionId={results.competitionId} joint={winners.length > 1} />
            ))}
          </CardGrid>
        )}
      </Box>

      <Stack spacing={3}>
        <VotesBarChart entries={results.entries} />
        <ShareDonut entries={results.entries} totalVotes={results.totalVotes} />
        <VotesTimeline timeline={results.timeline} />
      </Stack>
    </>
  )
}

function formatEnd(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso.endsWith('Z') ? iso : `${iso}Z`))
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, flex: 1 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="h2" component="div">
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" component="div">
          {hint}
        </Typography>
      )}
    </Paper>
  )
}

function WinnerCard({ entry, competitionId, joint }: { entry: ResultEntry; competitionId: number; joint: boolean }) {
  return (
    <Card component="article" sx={{ borderColor: 'primary.main', borderWidth: 2 }}>
      <CardActionArea component={RouterLink} to={`/competitions/${competitionId}/entries/${entry.entryId}`}>
        {entry.coverImage && (
          <LazyImage src={imageUrl(entry.coverImage.thumbnailKey)} alt={entry.coverImage.altText || entry.title} placeholder={entry.coverImage.placeholder} eager />
        )}
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Chip icon={<EmojiEventsIcon />} label={joint ? 'Joint winner' : 'Winner'} color="primary" size="small" />
          </Stack>
          <Typography variant="h3" component="h3">
            {entry.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {entry.ownerLabel} · {entry.votes} {entry.votes === 1 ? 'vote' : 'votes'} · {entry.sharePercent.toFixed(0)}% share
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
