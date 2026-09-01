import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/BrandLogo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../../state/auth'

export default function LoginPage() {
  const { t } = useTranslation('auth')
  const { user, loading: sessionLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Fase 5 (OIDC): api/auth/oidc/callback.js redirige aqui con
  // ?oidc_error=<codigo> cuando el login con Nextcloud falla (usuario sin
  // cuenta local, inactivo, etc.) -- el login local sigue disponible abajo,
  // esto solo informa por que fallo el otro camino.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo debe reaccionar a que cambie el querystring, no a t/navigate/location.pathname
  useEffect(() => {
    const oidcError = new URLSearchParams(location.search).get('oidc_error')
    if (!oidcError) return
    if (oidcError === 'no_local_account') setError(t('oidcErrorNoLocalAccount'))
    else if (oidcError === 'inactive_user') setError(t('oidcErrorInactiveUser'))
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
      if (err.status === 401) setError(t('errorInvalidCredentials'))
      else if (err.status === 403) setError(t('errorInactiveUser'))
      else setError(t('errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

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

          {error && <Alert variant="destructive">{error}</Alert>}

          <Button type="submit" size="lg" disabled={submitting} className="mt-2 font-bold">
            {submitting ? <Loader2 size={22} className="animate-spin" /> : t('submit')}
          </Button>
        </form>

        {/* Fase 5 (OIDC): siempre visible -- si el SSO real de Nextcloud
            todavia no esta configurado en el servidor, /api/auth/oidc/start
            responde 404 y el usuario simplemente sigue con el login de
            arriba. Evita depender de una variable VITE_* que habria que
            mantener sincronizada con la config real del backend. */}
        <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          {t('oidcDivider')}
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button asChild variant="outline" size="lg" className="mt-4 font-bold">
          <a href="/api/auth/oidc/start">{t('oidcButton')}</a>
        </Button>
      </div>
    </div>
  )
}
