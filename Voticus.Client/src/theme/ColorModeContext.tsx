import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { PaletteMode } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { createAppTheme } from './theme'

const STORAGE_KEY = 'voticus.colorMode'

interface ColorModeValue {
  mode: PaletteMode
  toggle: () => void
}

const ColorModeContext = createContext<ColorModeValue | undefined>(undefined)

function readInitialMode(): PaletteMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage can be blocked. Fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ColorModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<PaletteMode>(readInitialMode)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Ignore. The choice simply will not persist.
    }
  }, [mode])

  const toggle = useCallback(() => setMode((m) => (m === 'light' ? 'dark' : 'light')), [])
  const theme = useMemo(() => createAppTheme(mode), [mode])
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle])

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useColorMode() {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode must be used inside ColorModeProvider')
  return ctx
}
