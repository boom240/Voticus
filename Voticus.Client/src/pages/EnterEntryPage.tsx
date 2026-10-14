import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getCompetition } from '../api/competitions'
import { createEntry } from '../api/entries'
import { ApiError, errorMessage } from '../api/client'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { FormSkeleton } from '../components/common/Skeletons'
import { useToast } from '../components/common/ToastProvider'
import { ImageUploader, type PendingImage } from '../components/entries/ImageUploader'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'

export function EnterEntryPage() {
  const { id } = useParams()
  const competitionId = Number(id)
  const { user, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { data: competition, loading } = useAsync(() => getCompetition(competitionId), [competitionId])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [errors, setErrors] = useState<{ title?: string; description?: string; images?: string }>({})
  const [busy, setBusy] = useState(false)

  if (loading || authLoading) return <FormSkeleton />

  if (!user) {
    return (
      <EmptyState title="Log in to enter" description="You need an approved account to enter a competition." action={{ label: 'Log in', to: '/login' }} />
    )
  }
  if (!competition) {
    return <EmptyState title="Competition not found" action={{ label: 'Back to competitions', to: '/' }} />
  }
  if (!user.isApproved) {
    return (
      <EmptyState
        title="Waiting for approval"
        description="Your account is waiting for an admin to approve it. You can enter once that is done."
        action={{ label: 'Back to competition', to: `/competitions/${competition.id}` }}
      />
    )
  }
  if (competition.myEntryId != null) {
    return (
      <EmptyState
        title="You have already entered"
        description="One entry per person per competition. You can edit your entry while the competition is open."
        action={{ label: 'Edit my entry', to: `/competitions/${competition.id}/entries/${competition.myEntryId}/edit` }}
      />
    )
  }
  if (!competition.canEnter) {
    return (
      <EmptyState
        title="Entries are closed"
        description="This competition is not open for entries."
        action={{ label: 'Back to competition', to: `/competitions/${competition.id}` }}
      />
    )
  }

  const validate = () => {
    const next: typeof errors = {}
    if (title.trim().length < 3) next.title = 'Give your entry a title of at least 3 characters.'
    if (title.trim().length > 100) next.title = 'Titles are at most 100 characters.'
    if (description.trim().length === 0) next.description = 'Add a short description.'
    if (description.trim().length > 1000) next.description = 'Descriptions are at most 1000 characters.'
    if (images.length === 0) next.images = 'Add at least one image.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    try {
      const created = await createEntry(competition.id, {
        title: title.trim(),
        description: description.trim(),
        images: images.map((img) => ({ file: img.file, altText: img.altText.trim() || title.trim() })),
      })
      showToast('Your entry is in.')
      navigate(`/competitions/${competition.id}/entries/${created.id}`)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length > 0) {
        setErrors({
          title: err.fieldError('title'),
          description: err.fieldError('description'),
          images: err.fieldError('images'),
        })
      } else {
        const message = errorMessage(err, 'Could not save your entry.')
        if (/image/i.test(message)) setErrors((prev) => ({ ...prev, images: message }))
        else showToast(message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Enter competition" subtitle={competition.title} />
      <Paper variant="outlined" sx={{ maxWidth: 760, p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          One entry per person. You can edit it until the competition closes.
        </Alert>
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={3}>
            <TextField
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title != null}
              helperText={errors.title ?? '3 to 100 characters'}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Description"
              required
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={errors.description != null}
              helperText={errors.description ?? `${description.length} of 1000 characters`}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
            />
            <div>
              <Typography variant="h3" component="h2" gutterBottom>
                Images
              </Typography>
              <ImageUploader images={images} onChange={setImages} defaultAltText={title} error={errors.images} />
            </div>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button component={RouterLink} to={`/competitions/${competition.id}`} color="inherit" disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Uploading' : 'Submit entry'}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Paper>
    </>
  )
}
