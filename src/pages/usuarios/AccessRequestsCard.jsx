import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiRequest } from '../../state/auth'
import { showToast } from '../../ui/toast'
import AccessRequestDecideRow from './AccessRequestDecideRow'

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
   personas que YA tenian cuenta local antes de que SSO estuviera configurado.

   2026-09-07 (mismo dia, "que me avise ahi tambien" -- Roman preguntando si estas solicitudes
   tambien le avisan en la campana de notificaciones): la fila real (mode/rol-o-usuario/
   aprobar-vincular-rechazar) se extrajo a AccessRequestDecideRow.jsx para que
   NotificationBell.jsx la reutilice tal cual -- esta tarjeta ya NO duplica esa logica, solo
   carga/lista/quita de su propio estado local. */
export default function AccessRequestsCard({ users, onUserCreated, onUserLinked }) {
  const { t } = useTranslation('usuarios')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

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

  function handleDecided(request, action, data) {
    setRequests((prev) => prev.filter((r) => r.id !== request.id))
    if (action === 'approve') onUserCreated?.(data.user)
    else if (action === 'link') onUserLinked?.(data.user)
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
            <AccessRequestDecideRow
              key={r.id}
              request={r}
              users={users}
              onDecided={(action, data) => handleDecided(r, action, data)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
