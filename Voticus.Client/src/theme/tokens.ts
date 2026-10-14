// Design tokens from design-spec.md section 10a. One accent, one neutral scale, two modes.
import type { PaletteMode } from '@mui/material'

export const fontFamily = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export const light = {
  primary: { main: '#4338CA', dark: '#3730A3', light: '#6366F1', contrastText: '#FFFFFF' },
  background: { default: '#F5F6F8', paper: '#FFFFFF' },
  text: { primary: '#111827', secondary: '#4B5563', disabled: '#9CA3AF' },
  divider: 'rgba(17, 24, 39, 0.12)',
  error: { main: '#B91C1C' },
  success: { main: '#15803D' },
  warning: { main: '#B45309' },
  info: { main: '#1D4ED8' },
}

export const dark = {
  primary: { main: '#A5B4FC', dark: '#818CF8', light: '#C7D2FE', contrastText: '#0F1117' },
  background: { default: '#121417', paper: '#1A1D22' },
  text: { primary: '#F3F4F6', secondary: '#A1A8B4', disabled: '#6B7280' },
  divider: 'rgba(243, 244, 246, 0.12)',
  error: { main: '#FCA5A5' },
  success: { main: '#86EFAC' },
  warning: { main: '#FCD34D' },
  info: { main: '#93C5FD' },
}

export type CompetitionStatus = 'Draft' | 'Upcoming' | 'Open' | 'Closed'

// Chip colours. Text always accompanies colour, see AC-V5.
export const statusColours: Record<PaletteMode, Record<CompetitionStatus, { fg: string; bg: string }>> = {
  light: {
    Open: { fg: '#14532D', bg: '#DCFCE7' },
    Upcoming: { fg: '#1E3A8A', bg: '#DBEAFE' },
    Closed: { fg: '#374151', bg: '#E5E7EB' },
    Draft: { fg: '#78350F', bg: '#FEF3C7' },
  },
  dark: {
    Open: { fg: '#86EFAC', bg: 'rgba(34, 197, 94, 0.18)' },
    Upcoming: { fg: '#93C5FD', bg: 'rgba(59, 130, 246, 0.18)' },
    Closed: { fg: '#D1D5DB', bg: 'rgba(156, 163, 175, 0.18)' },
    Draft: { fg: '#FCD34D', bg: 'rgba(245, 158, 11, 0.18)' },
  },
}

// Distinct series colours for charts, always paired with a text label.
export const chartColours = [
  '#4338CA',
  '#0E7490',
  '#B45309',
  '#BE185D',
  '#15803D',
  '#7C3AED',
  '#C2410C',
  '#0F766E',
  '#9F1239',
  '#4D7C0F',
]
