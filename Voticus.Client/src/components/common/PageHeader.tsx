import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  chips?: ReactNode
}

export function PageHeader({ title, subtitle, actions, chips }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      spacing={2}
      sx={{ mb: 4 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Typography variant="h1" component="h1" sx={{ overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
          {chips}
        </Stack>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} flexShrink={0}>
          {actions}
        </Stack>
      )}
    </Stack>
  )
}
