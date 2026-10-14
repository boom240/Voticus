import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableContainer from '@mui/material/TableContainer'
import type { PropsWithChildren } from 'react'

// Dense table with a sticky header, scrolling inside its own box.
export function AdminTable({ children, label, maxHeight = 640 }: PropsWithChildren<{ label: string; maxHeight?: number }>) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, maxHeight }}>
      <Table size="small" stickyHeader aria-label={label}>
        {children}
      </Table>
    </TableContainer>
  )
}
