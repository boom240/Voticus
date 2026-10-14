import { useState, type FormEvent } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { AdminCompetition, CompetitionUpsert } from '../../api/admin'
import { ApiError, errorMessage } from '../../api/client'
import { fromDateTimeLocal, toDateTimeLocal } from '../../utils/time'

interface Props {
  open: boolean
  competition?: AdminCompetition | null
  onSave: (body: CompetitionUpsert) => Promise<void>
  onClose: () => void
}

function defaultStart(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return toDateTimeLocal(d.toISOString())
}

function defaultEnd(): string {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  d.setDate(d.getDate() + 7)
  return toDateTimeLocal(d.toISOString())
}

// Times are entered in the admin's local time and sent as UTC.
export function CompetitionFormDialog({ open, competition, onSave, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="competition-form-title">
      {open && <CompetitionForm key={competition?.id ?? 'new'} competition={competition} onSave={onSave} onClose={onClose} />}
    </Dialog>
  )
}

function CompetitionForm({ competition, onSave, onClose }: Omit<Props, 'open'>) {
  const started = competition != null && competition.publishedAtUtc != null && competition.status !== 'Upcoming'
  const [title, setTitle] = useState(competition?.title ?? '')
  const [description, setDescription] = useState(competition?.description ?? '')
  const [starts, setStarts] = useState(competition ? toDateTimeLocal(competition.startsAtUtc) : defaultStart())
  const [ends, setEnds] = useState(competition ? toDateTimeLocal(competition.endsAtUtc) : defaultEnd())
  const [errors, setErrors] = useState<{ title?: string; description?: string; starts?: string; ends?: string; form?: string }>({})
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (title.trim().length < 3) next.title = 'At least 3 characters.'
    if (!starts) next.starts = 'Choose a start time.'
    if (!ends) next.ends = 'Choose an end time.'
    if (starts && ends && new Date(ends) <= new Date(starts)) next.ends = 'The end must be after the start.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        startsAtUtc: fromDateTimeLocal(starts),
        endsAtUtc: fromDateTimeLocal(ends),
      })
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length > 0) {
        setErrors({ title: err.fieldError('title'), description: err.fieldError('description') })
      } else {
        const message = errorMessage(err)
        if (/start/i.test(message)) setErrors({ starts: message })
        else if (/end|hour|days/i.test(message)) setErrors({ ends: message })
        else setErrors({ form: message })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogTitle id="competition-form-title">{competition ? 'Edit competition' : 'New competition'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {errors.form && (
            <Typography variant="body2" color="error.main" role="alert">
              {errors.form}
            </Typography>
          )}
          <TextField
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title != null}
            helperText={errors.title ?? '3 to 100 characters'}
            slotProps={{ htmlInput: { maxLength: 100 } }}
            autoFocus
          />
          <TextField
            label="Description"
            multiline
            minRows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description != null}
            helperText={errors.description ?? 'Optional, up to 2000 characters'}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <TextField
            label="Starts (your local time)"
            type="datetime-local"
            required
            value={starts}
            onChange={(e) => setStarts(e.target.value)}
            error={errors.starts != null}
            helperText={errors.starts ?? (started ? 'Cannot change once started' : ' ')}
            disabled={started}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Ends (your local time)"
            type="datetime-local"
            required
            value={ends}
            onChange={(e) => setEnds(e.target.value)}
            error={errors.ends != null}
            helperText={errors.ends ?? (started ? 'Can only be extended once started' : 'Between 1 hour and 90 days after the start')}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={busy}>
          {competition ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </form>
  )
}
