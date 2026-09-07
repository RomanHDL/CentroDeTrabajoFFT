import dayjs from 'dayjs'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
import { showToast } from '../../ui/toast'

/* Solicitudes de acceso via SSO (2026-09-02, apps.mi2.com.mx/stack seccion 7c, adaptado --
   ver AccessRequest en schema.js). Aprobar aqui NO otorga un scope nuevo: crea un User real
   con el rol elegido, mismo camino que ya existe arriba en esta pagina (CreateUserDialog),
   solo que disparado desde una solicitud en vez de capturado a mano.

   2026-09-07 (bug real en vivo -- un ADMINISTRADOR con cuenta local de siempre probo el login
   SSO por primera vez y cayo aqui como si fuera alguien nuevo, "a quien le pedi permiso"):
   esperado, no un problema de seguridad -- esa cuenta local nunca tuvo oidcSub. "Aprobar"
   SIEMPRE creaba un User nuevo, lo que hubiera dejado una cuenta duplicada para la misma
   persona. Se agrega un segundo modo, "Vincular a cuenta existente" -- en vez de crear, hace
   UPDATE de oidcSub sobre un User que YA EXISTE (action='link' en decide.js), para las
   personas que YA tenian cuenta local antes de que SSO estuviera configurado. */
export default function AccessRequestsCard({ users, onUserCreated, onUserLinked }) {
  const { t } = useTranslation('usuarios')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [decidingId, setDecidingId] = useState(null)
  const [roleDraft, setRoleDraft] = useState({}) // { [requestId]: role }
  const [modeDraft, setModeDraft] = useState({}) // { [requestId]: 'new' | 'existing' }
  const [existingUserDraft, setExistingUserDraft] = useState({}) // { [requestId]: userId }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiRequest('/api/access-requests?status=PENDING')
      setRequests(data.requests)
    } catch (err) {
      showToast(err.message || t('accessRequestsCard.loadError'), 'error')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function decide(request, action) {
    setDecidingId(request.id)
    try {
      let body
      if (action === 'approve') body = { action, role: roleDraft[request.id] || 'LIDER' }
      else if (action === 'link') body = { action, userId: existingUserDraft[request.id] }
      else body = { action }

      const data = await apiRequest(`/api/access-requests/${request.id}/decide`, {
        method: 'POST',
        body,
      })
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
      if (action === 'approve') {
        showToast(t('accessRequestsCard.approvedToast', { name: request.name || request.email }), 'success')
        onUserCreated?.(data.user)
      } else if (action === 'link') {
        showToast(
          t('accessRequestsCard.linkedToast', { name: data.user.name, email: request.email }),
          'success',
        )
        onUserLinked?.(data.user)
      } else {
        showToast(t('accessRequestsCard.deniedToast', { name: request.name || request.email }), 'success')
      }
    } catch (err) {
      showToast(err.message || t('accessRequestsCard.decideError'), 'error')
    } finally {
      setDecidingId(null)
    }
  }

  if (!loading && requests.length === 0) return null

  return (
    <div className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">{t('accessRequestsCard.title')}</p>
      <p className="mb-4 text-[13px] text-muted-foreground">{t('accessRequestsCard.subtitle')}</p>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-[16px] border border-border p-4 sm:flex-row sm:items-end sm:justify-between"
            >
              <div>
                <p className="font-semibold">
                  {r.name || r.email}{' '}
                  <span className="font-normal text-muted-foreground">&lt;{r.email}&gt;</span>
                </p>
                {r.note && (
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {t('accessRequestsCard.noteLabel')}: {r.note}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('accessRequestsCard.requestedAtLabel')}:{' '}
                  {dayjs(r.requestedAt).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('accessRequestsCard.modeLabel')}</Label>
                  <Select
                    value={modeDraft[r.id] || 'new'}
                    onValueChange={(v) => setModeDraft((prev) => ({ ...prev, [r.id]: v }))}
                  >
                    <SelectTrigger className="w-[190px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{t('accessRequestsCard.modeNewAccount')}</SelectItem>
                      <SelectItem value="existing">
                        {t('accessRequestsCard.modeExistingAccount')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(modeDraft[r.id] || 'new') === 'new' ? (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t('accessRequestsCard.roleLabel')}</Label>
                    <Select
                      value={roleDraft[r.id] || 'LIDER'}
                      onValueChange={(v) => setRoleDraft((prev) => ({ ...prev, [r.id]: v }))}
                    >
                      <SelectTrigger className="w-[160px]">
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
                ) : (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t('accessRequestsCard.existingUserLabel')}</Label>
                    <Select
                      value={existingUserDraft[r.id] || ''}
                      onValueChange={(v) =>
                        setExistingUserDraft((prev) => ({ ...prev, [r.id]: v }))
                      }
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue
                          placeholder={t('accessRequestsCard.existingUserPlaceholder')}
                        />
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

                {(modeDraft[r.id] || 'new') === 'new' ? (
                  <Button
                    disabled={decidingId === r.id}
                    onClick={() => decide(r, 'approve')}
                    size="sm"
                  >
                    {t('accessRequestsCard.approveButton')}
                  </Button>
                ) : (
                  <Button
                    disabled={decidingId === r.id || !existingUserDraft[r.id]}
                    onClick={() => decide(r, 'link')}
                    size="sm"
                  >
                    {t('accessRequestsCard.linkButton')}
                  </Button>
                )}
                <Button
                  disabled={decidingId === r.id}
                  variant="outline"
                  onClick={() => decide(r, 'deny')}
                  size="sm"
                >
                  {t('accessRequestsCard.denyButton')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
