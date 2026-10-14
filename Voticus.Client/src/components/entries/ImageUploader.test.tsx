import { describe, expect, it } from 'vitest'
import { validateFiles } from './imageRules'

function file(name: string, type: string, size: number): File {
  const f = new File([new Uint8Array(1)], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

// AC-M5 client side: clear messages for the three rejection reasons.
describe('validateFiles', () => {
  it('rejects unsupported types with a message naming the file', () => {
    const { accepted, problems } = validateFiles([file('notes.txt', 'text/plain', 10)], 0)
    expect(accepted).toHaveLength(0)
    expect(problems[0]).toMatch(/"notes.txt" is not a JPEG, PNG, WebP or GIF/)
  })

  it('rejects files over 5 MB', () => {
    const { accepted, problems } = validateFiles([file('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)], 0)
    expect(accepted).toHaveLength(0)
    expect(problems[0]).toMatch(/over 5 MB/)
  })

  it('stops at ten images including ones already saved', () => {
    const files = Array.from({ length: 4 }, (_, i) => file(`p${i}.png`, 'image/png', 100))
    const { accepted, problems } = validateFiles(files, 8)
    expect(accepted).toHaveLength(2)
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/at most 10 images/)
  })

  it('accepts the four allowed types', () => {
    const files = [
      file('a.jpg', 'image/jpeg', 1),
      file('b.png', 'image/png', 1),
      file('c.webp', 'image/webp', 1),
      file('d.gif', 'image/gif', 1),
    ]
    expect(validateFiles(files, 0).accepted).toHaveLength(4)
  })
})
