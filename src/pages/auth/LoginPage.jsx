import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/BrandLogo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest, useAuth } from '../../state/auth'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { user, loading: sessionLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 2026-09-08 (a peticion explicita del usuario, "quiero que el inicio de sesion principal
  // sea por cloud... asi como el login que tenia antes, pero que abajo este el de iniciar
  // sesion por numero de empleado, le doy click y sale"): vuelve a Nextcloud como metodo
  // PRIMARIO/visible (como el diseño original de 2026-09-02), pero YA NO reemplaza al login
  // local por completo (eso se corrigio ayer, 2026-09-07) -- en vez de mostrar los dos
  // siempre juntos, el local queda oculto detras de un link secundario que lo revela al
  // hacer click. `showLocalForm` es ese toggle -- nunca se auto-abre solo.
  const [showLocalForm, setShowLocalForm] = useState(false)

  // "No estas registrado" (2026-09-08, a peticion explicita del usuario, "que me notifique...
  // boton de mandar solicitud... me llegue el numero de empleado en automatico"): distinto de
  // un error de credenciales -- api/auth/login.js devuelve code:'NOT_REGISTERED' cuando el
  // numero de empleado/username no tiene ningun User todavia (ver ese archivo para el
  // tradeoff de seguridad aceptado explicitamente). En vez de un error muerto, se ofrece
  // enviar la solicitud desde aqui mismo (api/auth/request-access.js, sin sesion) -- llega a
  // Usuarios > Solicitudes de acceso Y a la campana de notificaciones (NotificationBell.jsx),
  // ya con el numero de empleado listo para que el admin solo agregue nombre/rol/contraseña.
  const [notRegistered, setNotRegistered] = useState(false)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [requestError, setRequestError] = useState('')

  const [oidcConfigured, setOidcConfigured] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/oidc/status')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOidcConfigured(Boolean(data.configured))
      })
      .catch(() => {
        if (!cancelled) setOidcConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // api/auth/oidc/callback.js redirige aqui con ?oidc_error=<codigo> cuando el login con
  // Nextcloud falla de verdad (usuario inactivo, intercambio fallido, etc.) -- 2026-09-02:
  // "sin cuenta local" (no_local_account) YA NO es un error, redirige a
  // /solicitar-acceso en vez de aqui (ver callback.js).
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo debe reaccionar a que cambie el querystring, no a t/navigate/location.pathname
  useEffect(() => {
    const oidcError = new URLSearchParams(location.search).get('oidc_error')
    if (!oidcError) return
    if (oidcError === 'inactive_user') setError(t('oidcErrorInactiveUser'))
    else setError(t('oidcErrorGeneric'))
    navigate(location.pathname, { replace: true })
  }, [location.search])

  // Login siempre en vertical (tarjeta angosta, pensada para portrait)
  // — ya adentro de la app, en touch se intenta horizontal (ver
  // AppLayout). "Best effort": la Screen Orientation API solo
  // permite lock() en pantalla completa o PWA instalada
  // (Chrome/Android); Safari/iOS no la implementa. Si falla o no
  // existe, el diseño ya centrado/angosto de esta tarjeta se ve bien
  // en portrait de todas formas, con o sin el lock real.
  useEffect(() => {
    const orientation = window.screen?.orientation
    if (!orientation?.lock) return
    orientation.lock('portrait').catch(() => {})
  }, [])

  if (!sessionLoading && user) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return // evita doble click / doble submit
    setError('')
    setNotRegistered(false)
    setRequestSent(false)
    setRequestError('')

    if (!identifier.trim() || !password) {
      setError(t('errorRequired'))
      return
    }

    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      if (err.code === 'NOT_REGISTERED') setNotRegistered(true)
      else if (err.status === 401) setError(t('errorInvalidCredentials'))
      else if (err.status === 403) setError(t('errorInactiveUser'))
      else setError(t('errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendAccessRequest() {
    setRequestingAccess(true)
    setRequestError('')
    try {
      await apiRequest('/api/auth/request-access', {
        method: 'POST',
        body: { employeeNumber: identifier.trim() },
      })
      setRequestSent(true)
    } catch (err) {
      setRequestError(err.message || t('accessRequestError'))
    } finally {
      setRequestingAccess(false)
    }
  }

  const localForm = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-identifier">{t('identifierLabel')}</Label>
        <Input
          id="login-identifier"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoFocus
          disabled={submitting}
          autoComplete="username"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">{t('passwordLabel')}</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          autoComplete="current-password"
        />
      </div>

      {notRegistered ? (
        <div className="flex flex-col gap-2">
          <Alert variant="destructive">{t('notRegisteredMessage')}</Alert>
          {requestSent ? (
            <Alert>{t('accessRequestSent')}</Alert>
          ) : (
            <>
              {requestError && <Alert variant="destructive">{requestError}</Alert>}
              <Button
                type="button"
                variant="outline"
                disabled={requestingAccess}
                onClick={handleSendAccessRequest}
              >
                {requestingAccess ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  t('sendAccessRequestButton')
                )}
              </Button>
            </>
          )}
        </div>
      ) : (
        error && <Alert variant="destructive">{error}</Alert>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="mt-2 font-bold">
        {submitting ? <Loader2 size={22} className="animate-spin" /> : t('submit')}
      </Button>
    </form>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] rounded-[30px] border border-border bg-card p-6 text-foreground sm:p-8">
        {/* Marca general de la plataforma (2026-08-29, cambio de branding a
            peticion explicita del usuario) -- ver src/components/BrandLogo.jsx.
            El login/autenticacion en si no cambia, solo esta cabecera visual. */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <BrandLogo variant="login" />
          <p className="text-center text-[13px] text-muted-foreground">{t('tagline')}</p>
        </div>

        {oidcConfigured === null && (
          <div className="flex justify-center py-6">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {oidcConfigured === false && localForm}

        {/* Nextcloud PRIMARIO (2026-09-08, ver comentario grande arriba de showLocalForm):
            solo aparece cuando el servidor confirma las 4 credenciales reales (ver
            api/auth/oidc/status.js). El login local queda detras del link secundario de
            abajo, revelado con un click -- nunca visible de entrada junto al de Nextcloud. */}
        {oidcConfigured === true && (
          <>
            {error && !showLocalForm && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}
            <Button asChild size="lg" className="w-full font-bold">
              <a href="/api/auth/oidc/start">{t('oidcButton')}</a>
            </Button>

            {!showLocalForm ? (
              <button
                type="button"
                onClick={() => setShowLocalForm(true)}
                className="mt-4 w-full text-center text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
              >
                {t('localLoginToggle')}
              </button>
            ) : (
              <div className="mt-5 flex flex-col gap-4">
                <div className="flex w-full items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">{t('oidcDivider')}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {localForm}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
