import { useState, type FormEvent, type SyntheticEvent } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { changePassword, deleteAccount, getMyEntries, getMyVotes } from '../api/account'
import { errorMessage } from '../api/client'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { LocalTime } from '../components/common/LocalTime'
import { PageHeader } from '../components/common/PageHeader'
import { TableSkeleton } from '../components/common/Skeletons'
import { StatusChip } from '../components/common/StatusChip'
import { useToast } from '../components/common/ToastProvider'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'

const tabs = ['entries', 'votes', 'profile'] as const
type TabKey = (typeof tabs)[number]

export function AccountPage() {
  const { user, loading } = useAuth()
  const [params, setParams] = useSearchParams()
  const current = (tabs as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as TabKey) : 'entries'

  if (loading) return <TableSkeleton />
  if (!user) {
    return <EmptyState title="Log in to see your account" action={{ label: 'Log in', to: '/login' }} />
  }

  const onChange = (_: SyntheticEvent, value: TabKey) => setParams({ tab: value })

  return (
    <>
      <PageHeader title="Account" subtitle={user.email} />
      {!user.isApproved && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your account is waiting for approval. An admin will approve it soon. Until then you can browse but not enter or vote.
        </Alert>
      )}
      <Tabs value={current} onChange={onChange} aria-label="Account sections" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="My entries" value="entries" id="tab-entries" aria-controls="panel-entries" />
        <Tab label="My votes" value="votes" id="tab-votes" aria-controls="panel-votes" />
        <Tab label="Profile" value="profile" id="tab-profile" aria-controls="panel-profile" />
      </Tabs>
      <Box role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`}>
        {current === 'entries' && <MyEntriesTab />}
        {current === 'votes' && <MyVotesTab />}
        {current === 'profile' && <ProfileTab email={user.email} />}
      </Box>
    </>
  )
}

function MyEntriesTab() {
  const { data, loading, error } = useAsync(getMyEntries, [])
  if (loading) return <TableSkeleton />
  if (error) return <EmptyState title="Could not load your entries" description={errorMessage(error)} />
  if (!data || data.length === 0) {
    return <EmptyState title="No entries yet" description="Enter an open competition and it will show here." action={{ label: 'See competitions', to: '/' }} />
  }
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
      <Table size="small" aria-label="My entries">
        <TableHead>
          <TableRow>
            <TableCell>Competition</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Entry</TableCell>
            <TableCell align="right">Votes received</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.entryId}>
              <TableCell>
                <Link component={RouterLink} to={`/competitions/${row.competitionId}`}>
                  {row.competitionTitle}
                </Link>
              </TableCell>
              <TableCell>
                <StatusChip status={row.competitionStatus} />
              </TableCell>
              <TableCell>
                <Link component={RouterLink} to={`/competitions/${row.competitionId}/entries/${row.entryId}`}>
                  {row.title}
                </Link>
              </TableCell>
              <TableCell align="right">{row.votesReceived ?? 'After close'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function MyVotesTab() {
  const { data, loading, error } = useAsync(getMyVotes, [])
  if (loading) return <TableSkeleton />
  if (error) return <EmptyState title="Could not load your votes" description={errorMessage(error)} />
  if (!data || data.length === 0) {
    return <EmptyState title="No votes yet" description="Vote in an open competition and it will show here." action={{ label: 'See competitions', to: '/' }} />
  }
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
      <Table size="small" aria-label="My votes">
        <TableHead>
          <TableRow>
            <TableCell>Competition</TableCell>
            <TableCell>Entry voted for</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.voteId}>
              <TableCell>
                <Link component={RouterLink} to={`/competitions/${row.competitionId}`}>
                  {row.competitionTitle}
                </Link>
              </TableCell>
              <TableCell>
                <Link component={RouterLink} to={`/competitions/${row.competitionId}/entries/${row.entryId}`}>
                  {row.entryTitle}
                </Link>
              </TableCell>
              <TableCell>
                <LocalTime value={row.createdAtUtc} variant="body2" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function ProfileTab({ email }: { email: string }) {
  const { logout } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      showToast('Password changed.')
    } catch (err) {
      setPasswordError(errorMessage(err, 'Could not change the password.'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setDeleteError(null)
    setBusy(true)
    try {
      await deleteAccount(deletePassword)
      logout()
      showToast('Your account has been deleted.')
      navigate('/')
    } catch (err) {
      setDeleteError(errorMessage(err, 'Could not delete the account.'))
      setBusy(false)
    }
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 520 }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Email
        </Typography>
        <Typography variant="body1">{email}</Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Change password
        </Typography>
        <form onSubmit={handlePassword} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={passwordError != null}
              helperText={passwordError ?? 'At least 6 characters with a number, an upper and lower case letter and a symbol.'}
            />
            <Box>
              <Button type="submit" variant="contained" disabled={busy || !currentPassword || !newPassword}>
                Change password
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Sign out
        </Typography>
        <Button
          variant="outlined"
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          Sign out
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: 'error.main' }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Delete account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Deleting your account removes your votes and your entries in open competitions. Entries in closed competitions
          stay, shown as "Deleted user", so past results do not change.
        </Typography>
        <Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>
          Delete my account
        </Button>
      </Paper>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete your account?"
        message={
          <Stack spacing={2}>
            <span>
              This removes your account, your votes and your entries in open competitions. Entries in closed competitions
              stay as "Deleted user". This cannot be undone.
            </span>
            <TextField
              label="Confirm your password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              error={deleteError != null}
              helperText={deleteError ?? ' '}
              fullWidth
            />
          </Stack>
        }
        confirmLabel="Delete account"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setDeleteError(null)
        }}
      />
    </Stack>
  )
}
