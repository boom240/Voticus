import { useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../../context/AuthContext'
import { ApiError, errorMessage } from '../../api/client'

export function RegisterPage() {
  const { register } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setBusy(true)
    try {
      await register(email, password)
      setDone(true)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length > 0) {
        setFieldErrors({
          email: err.fieldError('email'),
          password: err.errors[Object.keys(err.errors).find((k) => k.toLowerCase() === 'password') ?? '']?.join(' '),
        })
      } else {
        setError(errorMessage(err, 'Registration failed.'))
      }
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Paper variant="outlined" sx={{ maxWidth: 440, mx: 'auto', p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Thanks for registering
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          Your account is waiting for approval. An admin will approve it soon. You can log in now, but entering
          and voting open up once you are approved.
        </Alert>
        <Button variant="contained" component={RouterLink} to="/login">
          Log in
        </Button>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ maxWidth: 440, mx: 'auto', p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Register
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Registering gives you an account. An admin then approves you so you can enter and vote.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email != null}
            helperText={fieldErrors.email ?? ' '}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password != null}
            helperText={fieldErrors.password ?? 'At least 6 characters with a number, an upper and lower case letter and a symbol.'}
          />
          <Button type="submit" variant="contained" disabled={busy} size="large">
            {busy ? 'Registering' : 'Register'}
          </Button>
          <Typography variant="body2" color="text.secondary">
            Already registered?{' '}
            <Link component={RouterLink} to="/login">
              Log in
            </Link>
          </Typography>
        </Stack>
      </form>
    </Paper>
  )
}
