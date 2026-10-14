// Client side limits. The server enforces the same rules.
export const MAX_IMAGES = 10
export const MAX_BYTES = 5 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface PendingImage {
  id: string
  file: File
  altText: string
}

// Checks a file list client side. The server checks again, this just saves a round trip.
export function validateFiles(files: File[], currentCount: number): { accepted: File[]; problems: string[] } {
  const problems: string[] = []
  const accepted: File[] = []
  let remaining = MAX_IMAGES - currentCount
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      problems.push(`"${file.name}" is not a JPEG, PNG, WebP or GIF.`)
      continue
    }
    if (file.size > MAX_BYTES) {
      problems.push(`"${file.name}" is over 5 MB.`)
      continue
    }
    if (remaining <= 0) {
      problems.push(`"${file.name}" was skipped. An entry can have at most ${MAX_IMAGES} images.`)
      continue
    }
    accepted.push(file)
    remaining -= 1
  }
  return { accepted, problems }
}
