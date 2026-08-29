import { useState, useEffect } from 'react'
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

export default function EditUserDialog({ open, user, onClose, onSaved }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        employeeNumber: user.employeeNumber || '',
        username: user.username || '',
        role: user.role,
        active: user.active,
      })
      setError('')
    }
  }, [user])

  if (!form) return null

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.employeeNumber && !form.username) {
      setError('Debe conservar al menos número de empleado o username.')
      return
    }
    setSubmitting(true)
    try {
      const data = await apiRequest(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          employeeNumber: form.employeeNumber || null,
          username: form.username || null,
          role: form.role,
          active: form.active,
        },
      })
      onSaved(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Editar usuario</DialogTitle>
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
          select
          label="Estado"
          value={form.active ? '1' : '0'}
          onChange={(e) => set('active', e.target.value === '1')}
          fullWidth
        >
          <MenuItem value="1">Activo</MenuItem>
          <MenuItem value="0">Inactivo</MenuItem>
        </TextField>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? <CircularProgress size={20} /> : 'Guardar cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
