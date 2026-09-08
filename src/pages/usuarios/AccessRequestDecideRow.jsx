import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getRoleLabels } from '../../layout/roleLabels'
import { apiRequest } from '../../state/auth'
import { showToast } from '../../ui/toast'

/* Fila real de decision de una solicitud de acceso (aprobar/vincular/rechazar) -- extraida de
   AccessRequestsCard.jsx (2026-09-07) para reutilizarse tal cual en NotificationBell.jsx
   ("que me avise ahi tambien" -- antes las solicitudes de acceso solo vivian en Usuarios,
   invisibles hasta entrar a esa pantalla). UNICA fuente de la logica de decide() -- nunca dos
   copias que se puedan desincronizar (mismo criterio que server-lib/api-routes.js para las
   rutas).

   `compact` (bell, popover angosto) apila Accion/Rol-Cuenta en columna; sin `compact`
   (AccessRequestsCard.jsx, tarjeta ancha) los pone lado a lado -- mismo comportamiento visual
   de siempre en Usuarios, sin cambios.

   2026-09-08 (a peticion explicita del usuario, segundo origen de solicitud -- ver
   api/auth/request-access.js): `isLocal` (request.employeeNumber lleno, viene del intento de
   login local con un numero no registrado) es un caso distinto del de siempre (SSO,
   request.oidcSub/email lleno) -- sin "Vincular a cuenta existente" (no hay nada que vincular,
   es alguien nuevo de verdad), CON campos reales de Nombre (Nextcloud lo manda solo; un numero
   de empleado no) y Contraseña (esta cuenta SI hara login local real, nunca un hash aleatorio
   como las cuentas SSO). */
export default function AccessRequestDecideRow({ request, users, onDecided, compact = false }) {
  const { t } = useTranslation('usuarios')
  const isLocal = Boolean(request.employeeNumber)
  const [mode, setMode] = useState('new')
  const [name, setName] = useState(request.name || '')
  const [role, setRole] = useState('LIDER')
  const [password, setPassword] = useState('')
  const [existingUserId, setExistingUserId] = useState('')
  const [deciding, setDeciding] = useState(false)

  const displayName = () => name.trim() || request.name || request.email || request.employeeNumber

  async function decide(action) {
    setDeciding(true)
    try {
      let body
      if (action === 'approve') {
        body = { action, role, name: name.trim() }
        if (isLocal) body.password = password
      } else if (action === 'link') {
        body = { action, userId: existingUserId }
      } else {
        body = { action }
      }

      const data = await apiRequest(`/api/access-requests/${request.id}/decide`, {
        method: 'POST',
        body,
      })
      if (action === 'approve') {
        showToast(t('accessRequestsCard.approvedToast', { name: displayName() }), 'success')
      } else if (action === 'link') {
        showToast(
          t('accessRequestsCard.linkedToast', { name: data.user.name, email: request.email }),
          'success',
        )
      } else {
        showToast(t('accessRequestsCard.deniedToast', { name: displayName() }), 'success')
      }
      onDecided?.(action, data)
    } catch (err) {
      showToast(err.message || t('accessRequestsCard.decideError'), 'error')
    } finally {
      setDeciding(false)
    }
  }

  const approveDisabled = deciding || !name.trim() || (isLocal && password.length < 6)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[16px] border border-border p-4',
        !compact && 'sm:flex-row sm:items-end sm:justify-between',
      )}
    >
      <div className="min-w-0">
        <p className={cn('font-semibold', compact && 'text-[13.5px]')}>
          {isLocal
            ? request.name || t('accessRequestsCard.employeeNumberLabel', { number: request.employeeNumber })
            : request.name || request.email}
          {!isLocal && (
            <span className="font-normal text-muted-foreground"> &lt;{request.email}&gt;</span>
          )}
          {isLocal && request.name && (
            <span className="font-normal text-muted-foreground">
              {' '}
              · {t('accessRequestsCard.employeeNumberShort', { number: request.employeeNumber })}
            </span>
          )}
        </p>
        {request.note && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {t('accessRequestsCard.noteLabel')}: {request.note}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {t('accessRequestsCard.requestedAtLabel')}:{' '}
          {dayjs(request.requestedAt).format('DD/MM/YYYY HH:mm')}
        </p>
      </div>

      <div className={cn('flex flex-wrap items-end gap-2', compact && 'flex-col items-stretch')}>
        {!isLocal && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('accessRequestsCard.modeLabel')}</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className={compact ? 'w-full' : 'w-[190px]'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">{t('accessRequestsCard.modeNewAccount')}</SelectItem>
                <SelectItem value="existing">{t('accessRequestsCard.modeExistingAccount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'new' && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('accessRequestsCard.nameLabel')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('accessRequestsCard.namePlaceholder')}
              className={compact ? 'w-full' : 'w-[180px]'}
            />
          </div>
        )}

        {mode === 'new' && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('accessRequestsCard.roleLabel')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className={compact ? 'w-full' : 'w-[160px]'}>
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
        )}

        {mode === 'new' && isLocal && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('accessRequestsCard.passwordLabel')}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('accessRequestsCard.passwordPlaceholder')}
              className={compact ? 'w-full' : 'w-[160px]'}
            />
          </div>
        )}

        {mode === 'existing' && !isLocal && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('accessRequestsCard.existingUserLabel')}</Label>
            <Select value={existingUserId} onValueChange={setExistingUserId}>
              <SelectTrigger className={compact ? 'w-full' : 'w-[220px]'}>
                <SelectValue placeholder={t('accessRequestsCard.existingUserPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {(users || []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} {u.employeeNumber ? `(${u.employeeNumber})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={cn('flex gap-2', compact && 'flex-col')}>
          {mode === 'new' ? (
            <Button disabled={approveDisabled} onClick={() => decide('approve')} size="sm">
              {t('accessRequestsCard.approveButton')}
            </Button>
          ) : (
            <Button disabled={deciding || !existingUserId} onClick={() => decide('link')} size="sm">
              {t('accessRequestsCard.linkButton')}
            </Button>
          )}
          <Button disabled={deciding} variant="outline" onClick={() => decide('deny')} size="sm">
            {t('accessRequestsCard.denyButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}
