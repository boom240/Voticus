// Time formatting. Values from the API are ISO 8601 in UTC.

// Explicit parts rather than dateStyle, because timeZoneName cannot be combined with dateStyle.
const parts: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
}

const localFormatter = new Intl.DateTimeFormat(undefined, parts)
const utcFormatter = new Intl.DateTimeFormat('en-GB', { ...parts, timeZone: 'UTC' })

// Ensures the API value is read as UTC even when it has no trailing Z.
export function parseUtc(iso: string): Date {
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`)
}

export function formatLocalTime(iso: string): string {
  return localFormatter.format(parseUtc(iso))
}

export function formatUtc(iso: string): string {
  return utcFormatter.format(parseUtc(iso))
}

// Short relative wording for countdowns, for example "2 days 3 hours".
export function formatRemaining(target: string, now: Date = new Date()): string {
  const ms = parseUtc(target).getTime() - now.getTime()
  if (ms <= 0) return 'now'

  const minutes = Math.floor(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`
  if (mins > 0) return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`
  return 'under a minute'
}

// Converts an ISO UTC string to the value a datetime-local input expects.
export function toDateTimeLocal(iso: string): string {
  const d = parseUtc(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Converts a datetime-local value (viewer's local time) to ISO UTC.
export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString()
}
