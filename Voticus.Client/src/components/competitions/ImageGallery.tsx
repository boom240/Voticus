import { useCallback, useState, type KeyboardEvent } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { imageUrl } from '../../api/client'
import type { ImageInfo } from '../../types/competition'
import { LazyImage } from '../common/LazyImage'

interface ImageGalleryProps {
  images: ImageInfo[]
  title: string
}

// Main image with arrow keys, a thumbnail strip and a visible counter.
// Key this component on the entry id so the index resets when the entry changes.
export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [index, setIndex] = useState(0)
  const count = images.length

  const go = useCallback(
    (delta: number) => setIndex((i) => (count === 0 ? 0 : (i + delta + count) % count)),
    [count],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setIndex(count - 1)
    }
  }

  if (count === 0) {
    return null
  }

  const current = images[Math.min(index, count - 1)]

  return (
    <Box
      role="region"
      aria-roledescription="image gallery"
      aria-label={`${title} images`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      sx={{ outlineOffset: 4, borderRadius: 3 }}
    >
      <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', bgcolor: 'action.hover' }}>
        <LazyImage
          key={current.id}
          src={imageUrl(current.key)}
          alt={current.altText || title}
          placeholder={current.placeholder}
          aspectRatio="4 / 3"
          objectFit="contain"
          eager
        />
        {count > 1 && (
          <>
            <IconButton
              aria-label="Previous image"
              onClick={() => go(-1)}
              sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              aria-label="Next image"
              onClick={() => go(1)}
              sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
        <Typography
          variant="caption"
          aria-live="polite"
          sx={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: 'background.paper',
            fontWeight: 600,
          }}
        >
          {index + 1} / {count}
        </Typography>
      </Box>

      {count > 1 && (
        <Stack
          direction="row"
          spacing={1}
          role="tablist"
          aria-label="Choose image"
          sx={{ mt: 1.5, overflowX: 'auto', pb: 0.5 }}
        >
          {images.map((img, i) => (
            <Box
              key={img.id}
              component="button"
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1} of ${count}`}
              onClick={() => setIndex(i)}
              sx={{
                flex: '0 0 auto',
                width: 72,
                height: 54,
                p: 0,
                border: '2px solid',
                borderColor: i === index ? 'primary.main' : 'transparent',
                borderRadius: 1.5,
                overflow: 'hidden',
                cursor: 'pointer',
                bgcolor: 'transparent',
              }}
            >
              <Box
                component="img"
                src={imageUrl(img.thumbnailKey)}
                alt=""
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}
