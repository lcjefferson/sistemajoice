import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#32cd32', contrastText: '#ffffff' },
    secondary: { main: '#2ecc71' },
    error: { main: '#32cd32' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#111111', secondary: '#333333' }
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
    h6: { fontWeight: 700 }
  },
  components: {
    MuiAppBar: { styleOverrides: { root: { backgroundColor: '#32cd32', color: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 10 } } }
  }
})
