import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'
import { statusColours, type CompetitionStatus } from '../../theme/tokens'

interface StatusChipProps {
  status: CompetitionStatus
  size?: 'small' | 'medium'
}

// One chip per state. The label is always text, so colour is never the only cue.
export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const theme = useTheme()
  const colours = statusColours[theme.palette.mode][status]

  return (
    <Chip
      label={status}
      size={size}
      data-status={status}
      sx={{
        color: colours.fg,
        backgroundColor: colours.bg,
        fontWeight: 600,
        letterSpacing: '0.01em',
      }}
    />
  )
}
