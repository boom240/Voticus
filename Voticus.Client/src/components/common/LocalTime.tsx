import Tooltip from '@mui/material/Tooltip'
import Typography, { type TypographyProps } from '@mui/material/Typography'
import { formatLocalTime, formatUtc } from '../../utils/time'

interface LocalTimeProps extends Omit<TypographyProps, 'children'> {
  value: string
  prefix?: string
}

// Shows the viewer's local time with the zone name. The UTC value is in the tooltip.
export function LocalTime({ value, prefix, ...rest }: LocalTimeProps) {
  return (
    <Tooltip title={formatUtc(value)} enterTouchDelay={0}>
      <Typography component="time" dateTime={value} {...rest}>
        {prefix ? `${prefix} ` : ''}
        {formatLocalTime(value)}
      </Typography>
    </Tooltip>
  )
}
