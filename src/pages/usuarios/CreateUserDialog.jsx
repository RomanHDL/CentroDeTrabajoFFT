import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { apiRequest } from '../../state/auth'
import { ROLE_LABELS } from '../../layout/roleLabels'

const EMPTY = { employeeNumber: '', username: '', name: '', role: 'SUPERVISOR', password: '' }

export default function CreateUserDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.employeeNumber && !form.username) {
      setError('Indica al menos número de empleado o username.')
      return
    }
    if (!form.name.trim()) {
      setError('El nombre es requerido.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña temporal debe tener al menos 8 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const data = await apiRequest('/api/users', {
        method: 'POST',
        body: {
          employeeNumber: form.employeeNumber || undefined,
          username: form.username || undefined,
          name: form.name.trim(),
          role: form.role,
          password: form.password,
        },
      })
      onCreated(data.user)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Agregar usuario</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            label="Número de empleado"
            value={form.employeeNumber}
            onChange={(e) => set('employeeNumber', e.target.value)}
            fullWidth
          />
          <TextField
            label="Username"
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            fullWidth
          />
        </Box>
        <TextField
          label="Nombre completo"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          fullWidth
        />
        <TextField
          select
          label="Rol"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          fullWidth
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Contraseña temporal"
          type="text"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          fullWidth
          helperText="Mínimo 8 caracteres. El usuario deberá cambiarla en su primer inicio de sesión."
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? <CircularProgress size={20} /> : 'Crear usuario'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
