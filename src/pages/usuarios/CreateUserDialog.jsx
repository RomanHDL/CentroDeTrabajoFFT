import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLE_LABELS } from '../../layout/roleLabels'
import { apiRequest } from '../../state/auth'

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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Agregar usuario</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-2">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="create-user-employee-number">Número de empleado</Label>
              <Input
                id="create-user-employee-number"
                value={form.employeeNumber}
                onChange={(e) => set('employeeNumber', e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="create-user-username">Username</Label>
              <Input
                id="create-user-username"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-name">Nombre completo</Label>
            <Input
              id="create-user-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-role">Rol</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger id="create-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-user-password">Contraseña temporal</Label>
            <Input
              id="create-user-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo 8 caracteres. El usuario deberá cambiarla en su primer inicio de sesión.
            </p>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear usuario'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
