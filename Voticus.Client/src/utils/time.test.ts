import { describe, expect, it } from 'vitest'
import { formatLocalTime, formatRemaining, formatUtc, parseUtc } from './time'

describe('time formatting', () => {
  // AC-T5: local time includes the zone name
  it('includes a time zone name in the local format', () => {
    const text = formatLocalTime('2026-10-20T17:00:00Z')
    // Zone names vary by machine (GMT, BST, UTC, GMT+1), so check for one of the usual shapes.
    expect(text).toMatch(/(GMT|UTC|BST|[A-Z]{2,5}|GMT[+-]\d)/)
    expect(text).toMatch(/2026/)
  })

  it('formats the UTC value with the UTC zone', () => {
    expect(formatUtc('2026-10-20T17:00:00Z')).toMatch(/17:00.*UTC/)
  })

  it('treats API values without a zone as UTC', () => {
    expect(parseUtc('2026-10-20T17:00:00').toISOString()).toBe('2026-10-20T17:00:00.000Z')
  })

  it('describes the remaining time in days and hours', () => {
    const now = new Date('2026-10-13T12:00:00Z')
    expect(formatRemaining('2026-10-15T15:30:00Z', now)).toBe('2 days 3 hours')
    expect(formatRemaining('2026-10-13T13:05:00Z', now)).toBe('1 hour 5 minutes')
    expect(formatRemaining('2026-10-13T12:00:30Z', now)).toBe('under a minute')
    expect(formatRemaining('2026-10-13T11:00:00Z', now)).toBe('now')
  })
})
