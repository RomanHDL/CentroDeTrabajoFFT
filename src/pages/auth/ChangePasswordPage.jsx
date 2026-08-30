import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../../state/auth'

export default function ChangePasswordPage() {
  const { t } = useTranslation('auth')
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
      setError(t('errorPasswordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('errorPasswordMismatch'))
      return
    }

    setSubmitting(true)
    try {
      await changePassword(requiresCurrent ? currentPassword : undefined, newPassword)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || t('errorChangePasswordGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-[420px] rounded-[30px] border border-border bg-card p-6 text-foreground sm:p-8">
        <p className="mb-1 text-[17px] font-extrabold">{t('changePasswordTitle')}</p>
        {user?.mustChangePassword && (
          <p className="mb-4 text-[13px] text-muted-foreground">
            {t('changePasswordTemporaryNotice')}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          {requiresCurrent && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="change-password-current">{t('currentPasswordLabel')}</Label>
              <Input
                id="change-password-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={submitting}
                autoComplete="current-password"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="change-password-new">{t('newPasswordLabel')}</Label>
            <Input
              id="change-password-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t('newPasswordHint')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="change-password-confirm">{t('confirmPasswordLabel')}</Label>
            <Input
              id="change-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
            />
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <Button type="submit" size="lg" disabled={submitting} className="mt-2 font-bold">
            {submitting ? (
              <Loader2 size={22} className="animate-spin" />
            ) : (
              t('changePasswordSubmit')
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
