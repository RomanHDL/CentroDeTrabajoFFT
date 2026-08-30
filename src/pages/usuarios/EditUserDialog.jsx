import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { getRoleLabels } from '../../layout/roleLabels'
import { apiRequest } from '../../state/auth'

export default function EditUserDialog({ open, user, onClose, onSaved }) {
  const { t } = useTranslation('usuarios')
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
      setError(t('editUserDialog.missingIdentifierError'))
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
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('editUserDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-2">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-user-employee-number">
                {t('editUserDialog.employeeNumberLabel')}
              </Label>
              <Input
                id="edit-user-employee-number"
                value={form.employeeNumber}
                onChange={(e) => set('employeeNumber', e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="edit-user-username">Username</Label>
              <Input
                id="edit-user-username"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-name">{t('editUserDialog.nameLabel')}</Label>
            <Input
              id="edit-user-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-role">{t('editUserDialog.roleLabel')}</Label>
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger id="edit-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(getRoleLabels()).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-active">{t('editUserDialog.statusLabel')}</Label>
            <Select value={form.active ? '1' : '0'} onValueChange={(v) => set('active', v === '1')}>
              <SelectTrigger id="edit-user-active">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('editUserDialog.activeOption')}</SelectItem>
                <SelectItem value="0">{t('editUserDialog.inactiveOption')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <Alert variant="destructive">{error}</Alert>}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('editUserDialog.cancelButton')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t('editUserDialog.submitButton')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
