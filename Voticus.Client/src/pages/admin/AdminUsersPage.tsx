import { useState } from 'react'
import Chip from '@mui/material/Chip'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { adminApi, type AdminUser } from '../../api/admin'
import { errorMessage } from '../../api/client'
import { AdminTable } from '../../components/admin/AdminTable'
import { RowMenu, type RowAction } from '../../components/admin/RowMenu'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { LocalTime } from '../../components/common/LocalTime'
import { PageHeader } from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeletons'
import { useToast } from '../../components/common/ToastProvider'
import { useAuth } from '../../context/AuthContext'
import { useAsync } from '../../hooks/useAsync'

type Filter = 'All' | 'Pending' | 'Approved' | 'Admin'

interface Pending {
  user: AdminUser
  action: 'approve' | 'revokeApproval' | 'grantAdmin' | 'revokeAdmin'
}

const consequences: Record<Pending['action'], { title: string; message: string; label: string; destructive: boolean }> = {
  approve: { title: 'Approve this member?', message: 'They can enter and vote in open competitions straight away.', label: 'Approve', destructive: false },
  revokeApproval: { title: 'Revoke approval?', message: 'They can no longer enter or vote. Existing entries and votes stay.', label: 'Revoke', destructive: true },
  grantAdmin: { title: 'Grant admin?', message: 'They get full control over competitions, entries, votes and users.', label: 'Grant admin', destructive: false },
  revokeAdmin: { title: 'Revoke admin?', message: 'They lose access to the admin area. Their approval is not affected.', label: 'Revoke admin', destructive: true },
}

function roleLabel(u: AdminUser): string {
  if (u.isAdmin) return 'Admin'
  if (u.isApproved) return 'Approved'
  return 'Member'
}

export function AdminUsersPage() {
  const { user: me, refresh } = useAuth()
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync(adminApi.listUsers, [])
  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <TableSkeleton rows={6} />
  if (error) return <EmptyState title="Could not load users" description={errorMessage(error)} action={{ label: 'Try again', onClick: reload }} />

  const rows = (data ?? []).filter((u) => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'Pending') return !u.isApproved && !u.isAdmin
    if (filter === 'Approved') return u.isApproved
    if (filter === 'Admin') return u.isAdmin
    return true
  })

  const runPending = async () => {
    if (!pending) return
    setBusy(true)
    try {
      const { user, action } = pending
      if (action === 'approve') await adminApi.approve(user.id)
      if (action === 'revokeApproval') await adminApi.revokeApproval(user.id)
      if (action === 'grantAdmin') await adminApi.grantAdmin(user.id)
      if (action === 'revokeAdmin') await adminApi.revokeAdmin(user.id)
      showToast('Done.')
      setPending(null)
      reload()
      if (user.id === me?.id) refresh()
    } catch (err) {
      showToast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const actionsFor = (u: AdminUser): RowAction[] => [
    u.isApproved
      ? { label: 'Revoke approval', onClick: () => setPending({ user: u, action: 'revokeApproval' }), destructive: true }
      : { label: 'Approve', onClick: () => setPending({ user: u, action: 'approve' }) },
    u.isAdmin
      ? {
          label: 'Revoke admin',
          onClick: () => setPending({ user: u, action: 'revokeAdmin' }),
          destructive: true,
          // AC-D5: you cannot remove your own admin role.
          disabled: u.id === me?.id,
        }
      : { label: 'Grant admin', onClick: () => setPending({ user: u, action: 'grantAdmin' }) },
  ]

  return (
    <>
      <PageHeader title="Users" subtitle="Admin" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
        <TextField select label="Status" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} sx={{ minWidth: 160 }}>
          {(['All', 'Pending', 'Approved', 'Admin'] as Filter[]).map((f) => (
            <MenuItem key={f} value={f}>
              {f}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Search email" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }} />
        <Typography variant="body2" color="text.secondary">
          {rows.length} of {data?.length ?? 0}
        </Typography>
      </Stack>

      {rows.length === 0 ? (
        <EmptyState title="No users match" description="Try another filter or search." />
      ) : (
        <AdminTable label="Users">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Entries</TableCell>
              <TableCell align="right">Votes</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="right">
                <span className="sr-only">Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontWeight: u.id === me?.id ? 600 : undefined }}>
                  {u.email}
                  {u.id === me?.id && ' (you)'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={roleLabel(u)}
                    color={u.isAdmin ? 'primary' : u.isApproved ? 'success' : 'default'}
                    variant={u.isApproved || u.isAdmin ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="right">{u.entryCount}</TableCell>
                <TableCell align="right">{u.voteCount}</TableCell>
                <TableCell>
                  {u.createdAtUtc ? <LocalTime value={u.createdAtUtc} variant="body2" /> : <Typography variant="body2" color="text.secondary">Unknown</Typography>}
                </TableCell>
                <TableCell align="right">
                  <RowMenu label={`Actions for ${u.email}`} actions={actionsFor(u)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AdminTable>
      )}

      <ConfirmDialog
        open={pending != null}
        title={pending ? consequences[pending.action].title : ''}
        message={pending ? `${pending.user.email}: ${consequences[pending.action].message}` : ''}
        confirmLabel={pending ? consequences[pending.action].label : 'Confirm'}
        destructive={pending ? consequences[pending.action].destructive : false}
        busy={busy}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
