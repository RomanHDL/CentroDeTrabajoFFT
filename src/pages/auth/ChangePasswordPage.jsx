import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../../state/auth'

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const requiresCurrent = user && !user.mustChangePassword

  // El cambio FORZADO (contraseña temporal, mustChangePassword=true) sigue
  // disponible para cualquier rol — es un paso de seguridad obligatorio, no
  // una comodidad, y bloquearlo dejaria a alguien sin poder entrar nunca.
  // El cambio VOLUNTARIO (el usuario ya tiene su contraseña definitiva y
  // solo quiere actualizarla) queda restringido a ADMINISTRADOR (a peticion
  // explicita del usuario) — SUPERVISOR/LIDER que necesiten una contraseña
  // nueva la reciben de un administrador (ver "Restablecer contraseña" en
  // Usuarios). El backend (api/auth/change-password.js) repite esta misma
  // regla como defensa en profundidad, por si alguien llega aqui evitando
  // la UI.
  if (user && !user.mustChangePassword && user.role !== 'ADMINISTRADOR') {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      await changePassword(requiresCurrent ? currentPassword : undefined, newPassword)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 17, mb: 0.5 }}>Cambiar contraseña</Typography>
        {user?.mustChangePassword && (
          <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
            Tu contraseña es temporal. Debes establecer una nueva antes de continuar.
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {requiresCurrent && (
            <TextField
              label="Contraseña actual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              disabled={submitting}
              autoComplete="current-password"
            />
          )}
          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            disabled={submitting}
            autoComplete="new-password"
            helperText="Mínimo 8 caracteres"
          />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            disabled={submitting}
            autoComplete="new-password"
          />

          {error && <Alert severity="error">{error}</Alert>}

          <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 1, fontWeight: 700 }}>
            {submitting ? <CircularProgress size={22} color="inherit" /> : 'Guardar contraseña'}
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
