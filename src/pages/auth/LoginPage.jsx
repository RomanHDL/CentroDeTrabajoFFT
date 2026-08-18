import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import { useAuth } from '../../state/auth'

export default function LoginPage() {
  const { user, loading: sessionLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!sessionLoading && user) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return // evita doble click / doble submit
    setError('')

    if (!identifier.trim() || !password) {
      setError('Completa número de empleado/usuario y contraseña.')
      return
    }

    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      if (err.status === 401) setError('Credenciales incorrectas.')
      else if (err.status === 403) setError('Tu usuario está inactivo. Contacta a un administrador.')
      else setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'background.default', px: 2,
    }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 }, borderRadius: 3,
          border: '1px solid', borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 3 }}>
          <PrecisionManufacturingIcon sx={{ fontSize: 36, color: '#3B82F6' }} />
          <Typography sx={{ fontWeight: 800, fontSize: 18, textAlign: 'center' }}>
            Centro de Trabajo FFT
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: 13, textAlign: 'center' }}>
            Organización de áreas, líneas, estaciones y personal
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Número de empleado / Usuario"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
            fullWidth
            disabled={submitting}
            autoComplete="username"
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            disabled={submitting}
            autoComplete="current-password"
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ mt: 1, fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Iniciar sesión'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
