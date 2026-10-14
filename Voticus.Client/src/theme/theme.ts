import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles'
import { dark, fontFamily, light } from './tokens'

export function createAppTheme(mode: PaletteMode): Theme {
  const tokens = mode === 'light' ? light : dark

  const base = createTheme({
    palette: { mode, ...tokens },
    shape: { borderRadius: 8 },
    spacing: 8,
    typography: {
      fontFamily,
      fontSize: 16,
      htmlFontSize: 16,
      h1: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' },
      h2: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.25 },
      h3: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
      h5: { fontSize: '1rem', fontWeight: 600 },
      h6: { fontSize: '1rem', fontWeight: 600 },
      body1: { fontSize: '1rem', lineHeight: 1.5 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    transitions: {
      duration: {
        shortest: 100,
        shorter: 150,
        short: 150,
        standard: 200,
        complex: 200,
        enteringScreen: 200,
        leavingScreen: 150,
      },
    },
  })

  const hoverShadow =
    mode === 'light' ? '0 4px 16px rgba(17, 24, 39, 0.10)' : '0 4px 16px rgba(0, 0, 0, 0.45)'

  return createTheme(base, {
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: base.palette.background.default },
          // One visible focus ring everywhere, see AC-V2. The class selector outranks
          // MuiButtonBase, which sets outline 0 on its root.
          ':focus-visible, .MuiButtonBase-root:focus-visible': {
            outline: `2px solid ${base.palette.primary.main} !important`,
            outlineOffset: 2,
            borderRadius: 4,
          },
          // Stop motion for people who ask for it, see AC-V6.
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${base.palette.divider}`,
            boxShadow: 'none',
            transition: base.transitions.create(['box-shadow', 'border-color'], { duration: 150 }),
            '&:hover': { boxShadow: hoverShadow },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 40,
            [base.breakpoints.down('sm')]: { minHeight: 44 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { [base.breakpoints.down('sm')]: { minWidth: 44, minHeight: 44 } },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundColor: base.palette.background.paper,
            color: base.palette.text.primary,
            borderBottom: `1px solid ${base.palette.divider}`,
          },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 12 } },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, backgroundColor: base.palette.background.paper },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small' },
      },
      MuiSkeleton: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiLink: {
        defaultProps: { underline: 'hover' },
      },
    },
  })
}
