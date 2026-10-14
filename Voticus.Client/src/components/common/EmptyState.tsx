import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  description?: string
  action?: { label: string; to?: string; onClick?: () => void }
}

// Short line of text and one clear next action.
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Box
      role="status"
      sx={{
        textAlign: 'center',
        py: 8,
        px: 2,
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 3,
      }}
    >
      <Typography variant="h3" component="p" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 3 : 0 }}>
          {description}
        </Typography>
      )}
      {action &&
        (action.to ? (
          <Button variant="contained" component={RouterLink} to={action.to}>
            {action.label}
          </Button>
        ) : (
          <Button variant="contained" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </Box>
  )
}
