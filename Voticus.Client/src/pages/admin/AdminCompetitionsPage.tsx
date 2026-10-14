import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { adminApi, type AdminCompetition, type CompetitionUpsert } from '../../api/admin'
import { errorMessage } from '../../api/client'
import { AdminTable } from '../../components/admin/AdminTable'
import { CompetitionFormDialog } from '../../components/admin/CompetitionFormDialog'
import { RowMenu, type RowAction } from '../../components/admin/RowMenu'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { LocalTime } from '../../components/common/LocalTime'
import { PageHeader } from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeletons'
import { StatusChip } from '../../components/common/StatusChip'
import { useToast } from '../../components/common/ToastProvider'
import { useAsync } from '../../hooks/useAsync'
import type { CompetitionStatus } from '../../types/competition'

type Filter = 'All' | CompetitionStatus | 'Archived'

interface Pending {
  competition: AdminCompetition
  action: 'publish' | 'unpublish' | 'close' | 'archive' | 'unarchive' | 'delete'
}

const consequences: Record<Pending['action'], { title: string; message: string; label: string; destructive: boolean }> = {
  publish: { title: 'Publish this competition?', message: 'It becomes visible to everyone and opens at its start time.', label: 'Publish', destructive: false },
  unpublish: { title: 'Back to draft?', message: 'It disappears from the public list until you publish it again.', label: 'Back to draft', destructive: false },
  close: { title: 'Close this competition now?', message: 'Entries and votes stop immediately and results become public. The end time is set to now.', label: 'Close now', destructive: true },
  archive: { title: 'Archive this competition?', message: 'It is hidden from the public but kept with its entries and votes.', label: 'Archive', destructive: true },
  unarchive: { title: 'Restore this competition?', message: 'It becomes visible to the public again.', label: 'Restore', destructive: false },
  delete: { title: 'Delete this competition?', message: 'This permanently deletes the draft. It cannot be undone.', label: 'Delete', destructive: true },
}

export function AdminCompetitionsPage() {
  const { showToast } = useToast()
  const { data, loading, error, reload } = useAsync(adminApi.listCompetitions, [])
  const [filter, setFilter] = useState<Filter>('All')
  const [editing, setEditing] = useState<AdminCompetition | null | undefined>(undefined)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <TableSkeleton rows={6} />
  if (error) return <EmptyState title="Could not load competitions" description={errorMessage(error)} action={{ label: 'Try again', onClick: reload }} />

  const rows = (data ?? []).filter((c) => {
    if (filter === 'All') return true
    if (filter === 'Archived') return c.archivedAtUtc != null
    return c.status === filter && c.archivedAtUtc == null
  })

  const save = async (body: CompetitionUpsert) => {
    if (editing) {
      await adminApi.updateCompetition(editing.id, body)
      showToast('Competition saved.')
    } else {
      await adminApi.createCompetition(body)
      showToast('Competition created as a draft.')
    }
    setEditing(undefined)
    reload()
  }

  const runPending = async () => {
    if (!pending) return
    setBusy(true)
    try {
      const { competition, action } = pending
      if (action === 'publish') await adminApi.publish(competition.id)
      if (action === 'unpublish') await adminApi.unpublish(competition.id)
      if (action === 'close') await adminApi.close(competition.id)
      if (action === 'archive') await adminApi.archive(competition.id)
      if (action === 'unarchive') await adminApi.unarchive(competition.id)
      if (action === 'delete') await adminApi.deleteCompetition(competition.id)
      showToast('Done.')
      setPending(null)
      reload()
    } catch (err) {
      showToast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const actionsFor = (c: AdminCompetition): RowAction[] => {
    const archived = c.archivedAtUtc != null
    return [
      { label: 'Edit', onClick: () => setEditing(c) },
      ...(c.status === 'Draft' ? [{ label: 'Publish', onClick: () => setPending({ competition: c, action: 'publish' }) }] : []),
      ...(c.status === 'Upcoming' ? [{ label: 'Back to draft', onClick: () => setPending({ competition: c, action: 'unpublish' }) }] : []),
      ...(c.status === 'Open' ? [{ label: 'Close now', onClick: () => setPending({ competition: c, action: 'close' }), destructive: true }] : []),
      archived
        ? { label: 'Restore', onClick: () => setPending({ competition: c, action: 'unarchive' }) }
        : { label: 'Archive', onClick: () => setPending({ competition: c, action: 'archive' }), destructive: true },
      { label: 'Delete', onClick: () => setPending({ competition: c, action: 'delete' }), disabled: !c.canDelete, destructive: true },
    ]
  }

  return (
    <>
      <PageHeader
        title="Competitions"
        subtitle="Admin"
        actions={
          <Button variant="contained" onClick={() => setEditing(null)}>
            New competition
          </Button>
        }
      />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField select label="Status" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} sx={{ minWidth: 160 }}>
          {(['All', 'Draft', 'Upcoming', 'Open', 'Closed', 'Archived'] as Filter[]).map((f) => (
            <MenuItem key={f} value={f}>
              {f}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {rows.length} of {data?.length ?? 0}
        </Typography>
      </Stack>

      {rows.length === 0 ? (
        <EmptyState
          title="No competitions here"
          description={filter === 'All' ? 'Create the first one.' : 'Nothing matches this filter.'}
          action={filter === 'All' ? { label: 'New competition', onClick: () => setEditing(null) } : undefined}
        />
      ) : (
        <AdminTable label="Competitions">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Starts</TableCell>
              <TableCell>Ends</TableCell>
              <TableCell align="right">Entries</TableCell>
              <TableCell align="right">Votes</TableCell>
              <TableCell align="right">
                <span className="sr-only">Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Link component={RouterLink} to={`/admin/competitions/${c.id}`} sx={{ fontWeight: 500 }}>
                    {c.title}
                  </Link>
                  {c.archivedAtUtc && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      Archived
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <StatusChip status={c.status} />
                </TableCell>
                <TableCell>
                  <LocalTime value={c.startsAtUtc} variant="body2" />
                </TableCell>
                <TableCell>
                  <LocalTime value={c.endsAtUtc} variant="body2" />
                </TableCell>
                <TableCell align="right">{c.entryCount}</TableCell>
                <TableCell align="right">{c.voteCount}</TableCell>
                <TableCell align="right">
                  <RowMenu label={`Actions for ${c.title}`} actions={actionsFor(c)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AdminTable>
      )}

      <CompetitionFormDialog open={editing !== undefined} competition={editing} onSave={save} onClose={() => setEditing(undefined)} />

      <ConfirmDialog
        open={pending != null}
        title={pending ? consequences[pending.action].title : ''}
        message={pending ? `${pending.competition.title}: ${consequences[pending.action].message}` : ''}
        confirmLabel={pending ? consequences[pending.action].label : 'Confirm'}
        destructive={pending ? consequences[pending.action].destructive : false}
        busy={busy}
        onConfirm={runPending}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
