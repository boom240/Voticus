import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../../context/AuthContext'
import { errorMessage } from '../../api/client'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Invalid email or password.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ maxWidth: 440, mx: 'auto', p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Log in
      </Typography>
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error != null}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error != null}
            helperText={error ?? ' '}
          />
          <Button type="submit" variant="contained" disabled={busy} size="large">
            {busy ? 'Logging in' : 'Log in'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            No account yet?{' '}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>
        </Stack>
      </form>
    </Paper>
  )
}
