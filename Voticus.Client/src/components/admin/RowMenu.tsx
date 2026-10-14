import { useState, type MouseEvent } from 'react'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import MoreVertIcon from '@mui/icons-material/MoreVert'

export interface RowAction {
  label: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}

// Row actions behind one menu button, which keeps dense tables tidy.
export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget)
  const close = () => setAnchor(null)

  return (
    <>
      <IconButton aria-label={label} onClick={open} size="small" aria-haspopup="menu" aria-expanded={anchor != null}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={anchor != null} onClose={close}>
        {actions.map((action) => (
          <MenuItem
            key={action.label}
            disabled={action.disabled}
            onClick={() => {
              close()
              action.onClick()
            }}
            sx={action.destructive ? { color: 'error.main' } : undefined}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
