import { useState, type PropsWithChildren } from 'react'
import { Link as RouterLink, NavLink, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'
import { useAuth } from '../../context/AuthContext'
import { useColorMode } from '../../theme/ColorModeContext'

interface NavItem {
  label: string
  to: string
}

export function AppLayout({ children }: PropsWithChildren) {
  const { user, logout } = useAuth()
  const { mode, toggle } = useColorMode()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const primaryLinks: NavItem[] = [{ label: 'Competitions', to: '/' }]
  if (user?.isAdmin) primaryLinks.push({ label: 'Admin', to: '/admin/competitions' }, { label: 'Users', to: '/admin/users' })

  const accountLinks: NavItem[] = user
    ? [{ label: 'Account', to: '/account' }]
    : [
        { label: 'Log in', to: '/login' },
        { label: 'Register', to: '/register' },
      ]

  const handleLogout = () => {
    setDrawerOpen(false)
    logout()
    navigate('/')
  }

  const navButton = (item: NavItem) => (
    <Button
      key={item.to}
      component={NavLink}
      to={item.to}
      color="inherit"
      sx={{ '&.active': { color: 'primary.main', fontWeight: 600 } }}
    >
      {item.label}
    </Button>
  )

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" component="header">
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h3"
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'inherit', letterSpacing: '-0.02em', mr: 2 }}
          >
            Voticus
          </Typography>

          <Box
            component="nav"
            aria-label="Primary"
            sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, justifyContent: 'center', gap: 1 }}
          >
            {primaryLinks.map(navButton)}
          </Box>

          <Box sx={{ flex: { xs: 1, md: 0 } }} />

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
            {accountLinks.map(navButton)}
            {user && (
              <Button color="inherit" onClick={handleLogout}>
                Sign out
              </Button>
            )}
          </Stack>

          <IconButton
            aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            onClick={toggle}
            edge="end"
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 280 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
          <Typography variant="h3" component="span">
            Voticus
          </Typography>
          <IconButton aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>
        <Divider />
        <List component="nav" aria-label="Primary">
          {primaryLinks.map((item) => (
            <ListItemButton key={item.to} component={RouterLink} to={item.to} onClick={() => setDrawerOpen(false)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
        <Divider />
        <List>
          {user && (
            <ListItemButton disabled>
              <ListItemText primary={user.email} primaryTypographyProps={{ noWrap: true, variant: 'body2' }} />
            </ListItemButton>
          )}
          {accountLinks.map((item) => (
            <ListItemButton key={item.to} component={RouterLink} to={item.to} onClick={() => setDrawerOpen(false)}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
          {user && (
            <ListItemButton onClick={handleLogout}>
              <ListItemText primary="Sign out" />
            </ListItemButton>
          )}
        </List>
      </Drawer>

      <Container component="main" maxWidth="lg" sx={{ flex: 1, py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{ borderTop: '1px solid', borderColor: 'divider', py: 2, px: 2, textAlign: 'center' }}
      >
        <Typography variant="caption" color="text.secondary">
          Voticus. Competitions for the community.
        </Typography>
      </Box>
    </Box>
  )
}
