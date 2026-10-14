import Box from '@mui/material/Box'
import { useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  // Tiny blurred data URL shown while the full image loads.
  placeholder?: string | null
  aspectRatio?: string
  objectFit?: 'cover' | 'contain'
  eager?: boolean
}

// Fixed aspect ratio box so the grid never jumps, with a blurred placeholder behind.
export function LazyImage({
  src,
  alt,
  placeholder,
  aspectRatio = '4 / 3',
  objectFit = 'cover',
  eager = false,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio,
        overflow: 'hidden',
        bgcolor: 'action.hover',
        backgroundImage: placeholder ? `url(${placeholder})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {placeholder && !loaded && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        />
      )}
      <Box
        component="img"
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit,
          opacity: loaded ? 1 : 0,
          transition: (theme) => theme.transitions.create('opacity', { duration: 200 }),
        }}
      />
    </Box>
  )
}
