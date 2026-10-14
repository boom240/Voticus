import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { getCompetitions } from '../api/competitions'
import { errorMessage } from '../api/client'
import { CardGrid } from '../components/common/CardGrid'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { CardGridSkeleton, PageHeaderSkeleton } from '../components/common/Skeletons'
import { CompetitionCard } from '../components/competitions/CompetitionCard'
import { useAsync } from '../hooks/useAsync'
import type { CompetitionStatus, CompetitionSummary } from '../types/competition'

const groups: { status: CompetitionStatus; title: string }[] = [
  { status: 'Open', title: 'Open' },
  { status: 'Upcoming', title: 'Upcoming' },
  { status: 'Closed', title: 'Closed' },
]

export function CompetitionListPage() {
  const { data, loading, error, reload } = useAsync(getCompetitions, [])

  if (loading) {
    return (
      <>
        <PageHeaderSkeleton />
        <CardGridSkeleton count={6} withImage={false} />
      </>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Could not load competitions"
        description={errorMessage(error)}
        action={{ label: 'Try again', onClick: reload }}
      />
    )
  }

  const competitions = data ?? []
  if (competitions.length === 0) {
    return (
      <>
        <PageHeader title="Competitions" />
        <EmptyState title="No competitions yet" description="Check back soon. New competitions appear here as soon as they open." />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Competitions" subtitle="Browse entries, and vote once you are an approved member." />
      {groups.map(({ status, title }) => {
        const items = competitions.filter((c: CompetitionSummary) => c.status === status)
        if (items.length === 0) return null
        return (
          <Box component="section" key={status} sx={{ mb: 5 }} aria-labelledby={`group-${status}`}>
            <Typography variant="h2" component="h2" id={`group-${status}`} sx={{ mb: 2 }}>
              {title}
            </Typography>
            <CardGrid>
              {items.map((c) => (
                <CompetitionCard key={c.id} competition={c} />
              ))}
            </CardGrid>
          </Box>
        )
      })}
    </>
  )
}
