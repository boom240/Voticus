import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { ACCEPTED_TYPES, MAX_IMAGES, validateFiles, type PendingImage } from './imageRules'

export type { PendingImage } from './imageRules'

interface ImageUploaderProps {
  images: PendingImage[]
  onChange: (images: PendingImage[]) => void
  // Images already saved on the server count towards the limit when editing.
  existingCount?: number
  defaultAltText: string
  error?: string | null
}

let nextId = 0

export function ImageUploader({ images, onChange, existingCount = 0, defaultAltText, error }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const previews = useMemo(() => images.map((img) => ({ id: img.id, url: URL.createObjectURL(img.file) })), [images])
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url))
  }, [previews])

  const total = existingCount + images.length

  const addFiles = (files: File[]) => {
    const { accepted, problems: found } = validateFiles(files, total)
    setProblems(found)
    if (accepted.length > 0) {
      onChange([...images, ...accepted.map((file) => ({ id: `new-${nextId++}`, file, altText: '' }))])
    }
  }

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (dragIndex != null) {
      setDragIndex(null)
      return
    }
    addFiles(Array.from(e.dataTransfer.files))
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index))

  const setAlt = (index: number, altText: string) =>
    onChange(images.map((img, i) => (i === index ? { ...img, altText } : img)))

  return (
    <Stack spacing={2}>
      <Box
        onDragOver={(e) => {
          e.preventDefault()
          if (dragIndex == null) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        sx={{
          border: '2px dashed',
          borderColor: error ? 'error.main' : dragOver ? 'primary.main' : 'divider',
          borderRadius: 3,
          p: 3,
          textAlign: 'center',
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          transition: (t) => t.transitions.create(['border-color', 'background-color'], { duration: 150 }),
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          hidden
          onChange={onInput}
          aria-label="Choose images"
          data-testid="image-input"
        />
        <AddPhotoIcon sx={{ fontSize: 40, color: 'text.secondary' }} aria-hidden />
        <Typography variant="body1" sx={{ mt: 1 }}>
          Drag and drop images here, or
        </Typography>
        <Button variant="outlined" onClick={() => inputRef.current?.click()} disabled={total >= MAX_IMAGES} sx={{ mt: 1 }}>
          Choose images
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          JPEG, PNG, WebP or GIF. Up to 5 MB each. {total} of {MAX_IMAGES} used.
        </Typography>
      </Box>

      {(error || problems.length > 0) && (
        <Stack spacing={0.5} role="alert">
          {error && (
            <Typography variant="body2" color="error.main">
              {error}
            </Typography>
          )}
          {problems.map((p) => (
            <Typography key={p} variant="body2" color="error.main">
              {p}
            </Typography>
          ))}
        </Stack>
      )}

      {images.length > 0 && (
        <Stack component="ol" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }} aria-label="New images">
          {images.map((img, index) => (
            <Stack
              key={img.id}
              component="li"
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (dragIndex != null) move(dragIndex, index)
                setDragIndex(null)
              }}
              onDragEnd={() => setDragIndex(null)}
              sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: dragIndex === index ? 'primary.main' : 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                cursor: 'grab',
              }}
            >
              <Box
                component="img"
                src={previews.find((p) => p.id === img.id)?.url}
                alt={img.altText || `${defaultAltText}, image ${index + 1}`}
                sx={{ width: { xs: '100%', sm: 120 }, aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1.5 }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {index + 1}. {img.file.name}
                </Typography>
                <TextField
                  label="Alt text"
                  value={img.altText}
                  onChange={(e) => setAlt(index, e.target.value)}
                  placeholder={defaultAltText || 'Describe the image'}
                  fullWidth
                  sx={{ mt: 1 }}
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              </Box>
              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                <IconButton aria-label={`Move image ${index + 1} up`} onClick={() => move(index, index - 1)} disabled={index === 0}>
                  <ArrowUpwardIcon />
                </IconButton>
                <IconButton
                  aria-label={`Move image ${index + 1} down`}
                  onClick={() => move(index, index + 1)}
                  disabled={index === images.length - 1}
                >
                  <ArrowDownwardIcon />
                </IconButton>
                <IconButton aria-label={`Remove image ${index + 1}`} onClick={() => remove(index)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
