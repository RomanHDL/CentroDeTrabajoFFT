import { createTheme } from '@mui/material/styles'

export function buildTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#1D4ED8' },
      background: {
        default: mode === 'dark' ? '#0B1120' : '#F4F6F9',
        paper: mode === 'dark' ? '#0F172A' : '#FFFFFF',
      },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
  })
}
