import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import { CardGrid } from './CardGrid'

// Placeholders match the final layout so nothing jumps when content arrives.

export function CardSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <Card data-testid="card-skeleton">
      {withImage && <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 3', height: 'auto', borderRadius: 0 }} />}
      <CardContent>
        <Skeleton width="70%" height={28} />
        <Skeleton width="40%" />
        <Skeleton width="55%" />
      </CardContent>
    </Card>
  )
}

export function CardGridSkeleton({ count = 6, withImage = true }: { count?: number; withImage?: boolean }) {
  return (
    <CardGrid>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} withImage={withImage} />
      ))}
    </CardGrid>
  )
}

export function PageHeaderSkeleton() {
  return (
    <Box sx={{ mb: 4 }} data-testid="page-skeleton">
      <Skeleton width="45%" height={44} />
      <Skeleton width="25%" />
    </Box>
  )
}

export function DetailSkeleton() {
  return (
    <Stack spacing={2} data-testid="detail-skeleton">
      <Skeleton variant="rectangular" sx={{ aspectRatio: '4 / 3', height: 'auto', maxHeight: 520 }} />
      <Skeleton width="50%" height={36} />
      <Skeleton width="100%" />
      <Skeleton width="85%" />
    </Stack>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Stack spacing={1} data-testid="table-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={44} />
      ))}
    </Stack>
  )
}

export function FormSkeleton() {
  return (
    <Stack spacing={2} data-testid="form-skeleton">
      <Skeleton height={44} />
      <Skeleton height={120} />
      <Skeleton width={120} height={44} />
    </Stack>
  )
}
