import Typography, { type TypographyProps } from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { formatRemaining } from '../../utils/time'

interface CountdownProps extends Omit<TypographyProps, 'children'> {
  target: string
  prefix?: string
  // Shown once the target has passed.
  passedLabel?: string
}

// Updates once a minute, which is enough for a competition that runs for hours or days.
export function Countdown({ target, prefix = 'Closes in', passedLabel = 'Closed', ...rest }: CountdownProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const remaining = formatRemaining(target, now)
  return (
    <Typography component="span" {...rest}>
      {remaining === 'now' ? passedLabel : `${prefix} ${remaining}`}
    </Typography>
  )
}
