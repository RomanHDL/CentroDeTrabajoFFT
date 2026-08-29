import { Cog, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '../../state/auth'

export default function LoginPage() {
  const { user, loading: sessionLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
      setError('Completa número de empleado/usuario y contraseña.')
      return
    }

    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      if (err.status === 401) setError('Credenciales incorrectas.')
      else if (err.status === 403)
        setError('Tu usuario está inactivo. Contacta a un administrador.')
      else setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] rounded-[30px] border border-border bg-card p-6 text-foreground sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Cog size={36} style={{ color: '#3B82F6' }} />
          <p className="text-center text-[18px] font-extrabold">Centro de Trabajo FFT</p>
          <p className="text-center text-[13px] text-muted-foreground">
            Organización de áreas, líneas, estaciones y personal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-identifier">Número de empleado / Usuario</Label>
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
            <Label htmlFor="login-password">Contraseña</Label>
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
            {submitting ? <Loader2 size={22} className="animate-spin" /> : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  )
}
