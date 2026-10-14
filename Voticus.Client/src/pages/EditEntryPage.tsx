import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import { getEntry } from '../api/competitions'
import {
  addEntryImages,
  deleteEntry,
  removeEntryImage,
  reorderEntryImages,
  updateEntry,
  updateImageAltText,
} from '../api/entries'
import { ApiError, errorMessage, imageUrl } from '../api/client'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/common/PageHeader'
import { FormSkeleton } from '../components/common/Skeletons'
import { useToast } from '../components/common/ToastProvider'
import { ImageUploader, type PendingImage } from '../components/entries/ImageUploader'
import { useAsync } from '../hooks/useAsync'
import type { EntryDetail, ImageInfo } from '../types/competition'

export function EditEntryPage() {
  const { id, entryId } = useParams()
  const competitionId = Number(id)
  const entryNumber = Number(entryId)
  const { data: entry, loading, error, setData } = useAsync(
    () => getEntry(competitionId, entryNumber),
    [competitionId, entryNumber],
  )

  if (loading) return <FormSkeleton />
  if (error || !entry) {
    return (
      <EmptyState
        title="Entry not found"
        description={error ? errorMessage(error) : undefined}
        action={{ label: 'Back', to: `/competitions/${competitionId}` }}
      />
    )
  }
  if (!entry.canEdit) {
    return (
      <EmptyState
        title="This entry cannot be edited"
        description={
          entry.competitionStatus === 'Open'
            ? 'Only the owner can edit an entry.'
            : 'Entries can only be changed while the competition is open.'
        }
        action={{ label: 'View entry', to: `/competitions/${entry.competitionId}/entries/${entry.id}` }}
      />
    )
  }

  // Keyed on the entry so the form state initialises from the loaded data.
  return <EditEntryForm key={entry.id} entry={entry} setEntry={setData} />
}

interface FormProps {
  entry: EntryDetail
  setEntry: (updater: (prev: EntryDetail) => EntryDetail) => void
}

// Title and description save on submit along with any new images. Image order, removal and alt text save at once.
function EditEntryForm({ entry, setEntry }: FormProps) {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState(entry.title)
  const [description, setDescription] = useState(entry.description)
  const [altDrafts, setAltDrafts] = useState<Record<number, string>>(() =>
    Object.fromEntries(entry.images.map((i) => [i.id, i.altText])),
  )
  const [newImages, setNewImages] = useState<PendingImage[]>([])
  const [errors, setErrors] = useState<{ title?: string; description?: string; images?: string }>({})
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ImageInfo | null>(null)

  const images = entry.images

  const run = async (work: () => Promise<void>, success?: string) => {
    setBusy(true)
    try {
      await work()
      if (success) showToast(success)
    } catch (err) {
      showToast(errorMessage(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const moveImage = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const next = [...images]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    run(async () => {
      const ordered = await reorderEntryImages(entry.competitionId, entry.id, next.map((i) => i.id))
      setEntry((prev) => ({ ...prev, images: ordered }))
    })
  }

  const removeImage = (image: ImageInfo) => {
    setRemoveTarget(null)
    run(async () => {
      await removeEntryImage(entry.competitionId, entry.id, image.id)
      setEntry((prev) => ({ ...prev, images: prev.images.filter((i) => i.id !== image.id) }))
    }, 'Image removed.')
  }

  const saveAlt = (image: ImageInfo) => {
    const draft = altDrafts[image.id] ?? ''
    if (draft === image.altText) return
    run(async () => {
      const updated = await updateImageAltText(entry.competitionId, entry.id, image.id, draft)
      setEntry((prev) => ({ ...prev, images: prev.images.map((i) => (i.id === image.id ? updated : i)) }))
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (title.trim().length < 3) next.title = 'Give your entry a title of at least 3 characters.'
    if (description.trim().length === 0) next.description = 'Add a short description.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      await updateEntry(entry.competitionId, entry.id, { title: title.trim(), description: description.trim() })
      if (newImages.length > 0) {
        await addEntryImages(
          entry.competitionId,
          entry.id,
          newImages.map((img) => ({ file: img.file, altText: img.altText.trim() || title.trim() })),
        )
      }
      showToast('Entry saved.')
      navigate(`/competitions/${entry.competitionId}/entries/${entry.id}`)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length > 0) {
        setErrors({ title: err.fieldError('title'), description: err.fieldError('description') })
      } else {
        const message = errorMessage(err, 'Could not save the entry.')
        if (/image/i.test(message)) setErrors((prev) => ({ ...prev, images: message }))
        else showToast(message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = () =>
    run(async () => {
      await deleteEntry(entry.competitionId, entry.id)
      navigate(`/competitions/${entry.competitionId}`)
    }, 'Entry deleted.')

  return (
    <>
      <PageHeader title="Edit entry" subtitle={entry.competitionTitle} />
      <Paper variant="outlined" sx={{ maxWidth: 760, p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
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
                Saved images
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Order and alt text changes save straight away.
              </Typography>
              <Stack component="ol" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }} aria-label="Saved images">
                {images.map((image, index) => (
                  <Stack
                    key={image.id}
                    component="li"
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                  >
                    <Box
                      component="img"
                      src={imageUrl(image.thumbnailKey)}
                      alt={image.altText}
                      sx={{ width: { xs: '100%', sm: 120 }, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1.5 }}
                    />
                    <TextField
                      label={`Alt text for image ${index + 1}`}
                      value={altDrafts[image.id] ?? ''}
                      onChange={(e) => setAltDrafts((d) => ({ ...d, [image.id]: e.target.value }))}
                      onBlur={() => saveAlt(image)}
                      fullWidth
                      slotProps={{ htmlInput: { maxLength: 200 } }}
                    />
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <IconButton
                        aria-label={`Move image ${index + 1} up`}
                        onClick={() => moveImage(index, -1)}
                        disabled={busy || index === 0}
                      >
                        <ArrowUpwardIcon />
                      </IconButton>
                      <IconButton
                        aria-label={`Move image ${index + 1} down`}
                        onClick={() => moveImage(index, 1)}
                        disabled={busy || index === images.length - 1}
                      >
                        <ArrowDownwardIcon />
                      </IconButton>
                      <IconButton
                        aria-label={`Remove image ${index + 1}`}
                        onClick={() => setRemoveTarget(image)}
                        disabled={busy || images.length <= 1}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </div>

            <div>
              <Typography variant="h3" component="h2" gutterBottom>
                Add images
              </Typography>
              <ImageUploader
                images={newImages}
                onChange={setNewImages}
                existingCount={images.length}
                defaultAltText={title}
                error={errors.images}
              />
            </div>

            <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap" useFlexGap>
              <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Delete entry
              </Button>
              <Stack direction="row" spacing={1}>
                <Button
                  component={RouterLink}
                  to={`/competitions/${entry.competitionId}/entries/${entry.id}`}
                  color="inherit"
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={busy}>
                  {busy ? 'Saving' : 'Save changes'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </form>
      </Paper>

      <ConfirmDialog
        open={removeTarget != null}
        title="Remove this image?"
        message="The image is removed from your entry straight away. This cannot be undone."
        confirmLabel="Remove image"
        destructive
        busy={busy}
        onConfirm={() => removeTarget && removeImage(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this entry?"
        message="This deletes the entry, its images and any votes it has received. It cannot be undone."
        confirmLabel="Delete entry"
        destructive
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
