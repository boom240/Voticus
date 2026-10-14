import Box from '@mui/material/Box'
import type { PropsWithChildren } from 'react'

// Responsive grid of cards, roughly 280px minimum width.
export function CardGrid({ children, minWidth = 280 }: PropsWithChildren<{ minWidth?: number }>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: {
          xs: '1fr',
          sm: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        },
      }}
    >
      {children}
    </Box>
  )
}
