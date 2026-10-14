import { useState, type FormEvent, type SyntheticEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Link from '@mui/material/Link'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { adminApi, type AdminEntry, type AdminVote } from '../../api/admin'
import { deleteEntry } from '../../api/entries'
import { errorMessage } from '../../api/client'
import { AdminTable } from '../../components/admin/AdminTable'
import { RowMenu } from '../../components/admin/RowMenu'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { LocalTime } from '../../components/common/LocalTime'
import { PageHeader } from '../../components/common/PageHeader'
import { TableSkeleton } from '../../components/common/Skeletons'
import { StatusChip } from '../../components/common/StatusChip'
import { useToast } from '../../components/common/ToastProvider'
import { ImageUploader, type PendingImage } from '../../components/entries/ImageUploader'
import { useAsync } from '../../hooks/useAsync'

const tabs = ['entries', 'votes', 'audit'] as const
type TabKey = (typeof tabs)[number]

export function AdminCompetitionPage() {
  const { id } = useParams()
  const competitionId = Number(id)
  const [params, setParams] = useSearchParams()
  const current = (tabs as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as TabKey) : 'entries'
  const { data: competition, loading, error, reload } = useAsync(() => adminApi.getCompetition(competitionId), [competitionId])

  if (loading) return <TableSkeleton />
  if (error || !competition) {
    return <EmptyState title="Competition not found" description={error ? errorMessage(error) : undefined} action={{ label: 'Back to admin', to: '/admin/competitions' }} />
  }

  const onChange = (_: SyntheticEvent, value: TabKey) => setParams({ tab: value })

  return (
    <>
      <PageHeader
        title={competition.title}
        chips={<StatusChip status={competition.status} size="medium" />}
        subtitle={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }}>
            <LocalTime value={competition.startsAtUtc} prefix="Starts" variant="body2" />
            <LocalTime value={competition.endsAtUtc} prefix="Ends" variant="body2" />
            <span>
              {competition.entryCount} entries, {competition.voteCount} votes
            </span>
          </Stack>
        }
        actions={
          <>
            <Button variant="outlined" component={RouterLink} to="/admin/competitions">
              All competitions
            </Button>
            <Button variant="outlined" component={RouterLink} to={`/competitions/${competition.id}`}>
              Public page
            </Button>
          </>
        }
      />
      <Tabs value={current} onChange={onChange} aria-label="Competition admin sections" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Entries" value="entries" id="tab-entries" aria-controls="panel-entries" />
        <Tab label="Votes" value="votes" id="tab-votes" aria-controls="panel-votes" />
        <Tab label="Audit log" value="audit" id="tab-audit" aria-controls="panel-audit" />
      </Tabs>
      <Box role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`}>
        {current === 'entries' && <EntriesTab competitionId={competition.id} onChanged={reload} />}
        {current === 'votes' && <VotesTab competitionId={competition.id} onChanged={reload} />}
        {current === 'audit' && <AuditTab competitionId={competition.id} />}
      </Box>
    </>
  )
}

function EntriesTab({ competitionId, onChanged }: { competitionId: number; onChanged: () => void }) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(() => adminApi.listEntries(competitionId), [competitionId])
  const [deleting, setDeleting] = useState<AdminEntry | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  if (loading) return <TableSkeleton />
  if (error) return <EmptyState title="Could not load entries" description={errorMessage(error)} action={{ label: 'Try again', onClick: reload }} />

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await deleteEntry(competitionId, deleting.id)
      showToast('Entry deleted.')
      setDeleting(null)
      reload()
      onChanged()
    } catch (err) {
      showToast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setCreating(true)}>
          Add entry for a member
        </Button>
      </Stack>
      {!data || data.length === 0 ? (
        <EmptyState title="No entries yet" description="Add one on behalf of a member if needed." action={{ label: 'Add entry', onClick: () => setCreating(true) }} />
      ) : (
        <AdminTable label="Entries">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="right">Images</TableCell>
              <TableCell align="right">Votes</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">
                <span className="sr-only">Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell>
                  <Link component={RouterLink} to={`/competitions/${competitionId}/entries/${e.id}`} sx={{ fontWeight: 500 }}>
                    {e.title}
                  </Link>
                </TableCell>
                <TableCell>{e.ownerEmail}</TableCell>
                <TableCell>{e.ownerLabel}</TableCell>
                <TableCell align="right">{e.imageCount}</TableCell>
                <TableCell align="right">{e.voteCount}</TableCell>
                <TableCell>
                  <LocalTime value={e.createdAtUtc} variant="body2" />
                </TableCell>
                <TableCell align="right">
                  <RowMenu
                    label={`Actions for ${e.title}`}
                    actions={[
                      { label: 'Edit entry and images', onClick: () => navigate(`/competitions/${competitionId}/entries/${e.id}/edit`) },
                      { label: 'Delete', onClick: () => setDeleting(e), destructive: true },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AdminTable>
      )}

      <ConfirmDialog
        open={deleting != null}
        title="Delete this entry?"
        message={`"${deleting?.title}" by ${deleting?.ownerEmail} is deleted along with its ${deleting?.voteCount ?? 0} votes. This cannot be undone.`}
        confirmLabel="Delete entry"
        destructive
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <CreateEntryDialog
        open={creating}
        competitionId={competitionId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false)
          reload()
          onChanged()
        }}
      />
    </>
  )
}

function CreateEntryDialog({
  open,
  competitionId,
  onClose,
  onCreated,
}: {
  open: boolean
  competitionId: number
  onClose: () => void
  onCreated: () => void
}) {
  const { showToast } = useToast()
  const { data: users } = useAsync(adminApi.listUsers, [open])
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!userId) return setError('Choose a member.')
    if (title.trim().length < 3) return setError('The title needs at least 3 characters.')
    if (images.length === 0) return setError('Add at least one image.')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('userId', userId)
      form.append('title', title.trim())
      form.append('description', description.trim())
      images.forEach((img) => {
        form.append('images', img.file)
        form.append('altTexts', img.altText.trim() || title.trim())
      })
      await adminApi.createEntryOnBehalf(competitionId, form)
      showToast('Entry added.')
      setUserId('')
      setTitle('')
      setDescription('')
      setImages([])
      onCreated()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="create-entry-title">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle id="create-entry-title">Add entry for a member</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && (
              <Typography variant="body2" color="error.main" role="alert">
                {error}
              </Typography>
            )}
            <TextField select label="Member" required value={userId} onChange={(e) => setUserId(e.target.value)}>
              {(users ?? []).map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
            <TextField
              label="Description"
              required
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            <ImageUploader images={images} onChange={setImages} defaultAltText={title} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Uploading' : 'Add entry'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function VotesTab({ competitionId, onChanged }: { competitionId: number; onChanged: () => void }) {
  const { showToast } = useToast()
  const { data, loading, error, reload, setData } = useAsync(() => adminApi.listVotes(competitionId), [competitionId])
  const { data: entries } = useAsync(() => adminApi.listEntries(competitionId), [competitionId])
  const { data: users } = useAsync(adminApi.listUsers, [])
  const [deleting, setDeleting] = useState<AdminVote | null>(null)
  const [changing, setChanging] = useState<AdminVote | null>(null)
  const [newEntryId, setNewEntryId] = useState('')
  const [adding, setAdding] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [addEntryId, setAddEntryId] = useState('')
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <TableSkeleton />
  if (error) return <EmptyState title="Could not load votes" description={errorMessage(error)} action={{ label: 'Try again', onClick: reload }} />

  const run = async (work: () => Promise<AdminVote[] | void>, success: string, inDialog = false) => {
    setBusy(true)
    setDialogError(null)
    try {
      const result = await work()
      if (result) setData(() => result)
      else reload()
      showToast(success)
      onChanged()
      return true
    } catch (err) {
      if (inDialog) setDialogError(errorMessage(err))
      else showToast(errorMessage(err), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const entryOptions = (entries ?? []).map((e) => (
    <MenuItem key={e.id} value={String(e.id)}>
      {e.title} ({e.ownerEmail})
    </MenuItem>
  ))

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button variant="contained" onClick={() => setAdding(true)}>
          Add vote
        </Button>
      </Stack>
      {!data || data.length === 0 ? (
        <EmptyState title="No votes yet" />
      ) : (
        <AdminTable label="Votes">
          <TableHead>
            <TableRow>
              <TableCell>Voter</TableCell>
              <TableCell>Entry</TableCell>
              <TableCell>Cast</TableCell>
              <TableCell align="right">
                <span className="sr-only">Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell>{v.voterEmail}</TableCell>
                <TableCell>{v.entryTitle}</TableCell>
                <TableCell>
                  <LocalTime value={v.createdAtUtc} variant="body2" />
                </TableCell>
                <TableCell align="right">
                  <RowMenu
                    label={`Actions for vote by ${v.voterEmail}`}
                    actions={[
                      {
                        label: 'Change entry',
                        onClick: () => {
                          setNewEntryId(String(v.entryId))
                          setChanging(v)
                        },
                      },
                      { label: 'Delete', onClick: () => setDeleting(v), destructive: true },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AdminTable>
      )}

      <ConfirmDialog
        open={deleting != null}
        title="Delete this vote?"
        message={`The vote by ${deleting?.voterEmail} for "${deleting?.entryTitle}" is removed. The change is logged. The member can vote again while the competition is open.`}
        confirmLabel="Delete vote"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!deleting) return
          if (await run(() => adminApi.deleteVote(competitionId, deleting.id), 'Vote deleted.')) setDeleting(null)
        }}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={changing != null}
        title="Change this vote?"
        message={
          <Stack spacing={2}>
            <span>
              Move the vote by {changing?.voterEmail} from "{changing?.entryTitle}" to another entry. The old and new values are logged.
            </span>
            <TextField select label="Entry" value={newEntryId} onChange={(e) => setNewEntryId(e.target.value)} fullWidth error={dialogError != null} helperText={dialogError ?? ' '}>
              {entryOptions}
            </TextField>
          </Stack>
        }
        confirmLabel="Change vote"
        destructive
        busy={busy}
        onConfirm={async () => {
          if (!changing) return
          if (await run(() => adminApi.changeVote(competitionId, changing.id, Number(newEntryId)), 'Vote changed.', true)) setChanging(null)
        }}
        onCancel={() => {
          setChanging(null)
          setDialogError(null)
        }}
      />

      <ConfirmDialog
        open={adding}
        title="Add a vote"
        message={
          <Stack spacing={2}>
            <span>The one vote per member and no self vote rules still apply. The addition is logged.</span>
            <TextField select label="Member" value={addUserId} onChange={(e) => setAddUserId(e.target.value)} fullWidth>
              {(users ?? []).map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Entry" value={addEntryId} onChange={(e) => setAddEntryId(e.target.value)} fullWidth error={dialogError != null} helperText={dialogError ?? ' '}>
              {entryOptions}
            </TextField>
          </Stack>
        }
        confirmLabel="Add vote"
        busy={busy}
        onConfirm={async () => {
          if (!addUserId || !addEntryId) {
            setDialogError('Choose a member and an entry.')
            return
          }
          if (await run(() => adminApi.createVote(competitionId, addUserId, Number(addEntryId)), 'Vote added.', true)) {
            setAdding(false)
            setAddUserId('')
            setAddEntryId('')
          }
        }}
        onCancel={() => {
          setAdding(false)
          setDialogError(null)
        }}
      />
    </>
  )
}

function AuditTab({ competitionId }: { competitionId: number }) {
  const { data, loading, error, reload } = useAsync(() => adminApi.audit(competitionId), [competitionId])
  if (loading) return <TableSkeleton />
  if (error) return <EmptyState title="Could not load the audit log" description={errorMessage(error)} action={{ label: 'Try again', onClick: reload }} />
  if (!data || data.length === 0) return <EmptyState title="Nothing logged yet" description="Admin changes to this competition, its entries and votes appear here." />

  return (
    <AdminTable label="Audit log">
      <TableHead>
        <TableRow>
          <TableCell>When</TableCell>
          <TableCell>Who</TableCell>
          <TableCell>Action</TableCell>
          <TableCell>Old value</TableCell>
          <TableCell>New value</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((a) => (
          <TableRow key={a.id} hover>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <LocalTime value={a.createdAtUtc} variant="body2" />
            </TableCell>
            <TableCell>{a.actorEmail}</TableCell>
            <TableCell>
              {a.action}
              <Typography variant="caption" color="text.secondary" display="block">
                {a.entityType} {a.entityId || ''}
              </Typography>
            </TableCell>
            <TableCell>
              <JsonCell value={a.oldValue} />
            </TableCell>
            <TableCell>
              <JsonCell value={a.newValue} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </AdminTable>
  )
}

function JsonCell({ value }: { value: string | null }) {
  if (!value) {
    return (
      <Typography variant="caption" color="text.secondary">
        none
      </Typography>
    )
  }
  let pretty = value
  try {
    pretty = JSON.stringify(JSON.parse(value), null, 1)
  } catch {
    // Leave as is.
  }
  return (
    <Box component="pre" sx={{ m: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap', maxWidth: 320, fontFamily: 'ui-monospace, monospace' }}>
      {pretty}
    </Box>
  )
}
