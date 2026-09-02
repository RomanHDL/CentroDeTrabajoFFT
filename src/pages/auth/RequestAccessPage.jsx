import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import BrandLogo from '@/components/BrandLogo'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/* 2026-09-02 (apps.mi2.com.mx/stack seccion 7, adaptado -- ver plan): a donde
   api/auth/oidc/callback.js redirige cuando alguien entra por SSO pero ningun User local
   tiene ese oidcSub todavia -- antes era un error muerto (no_local_account), ahora hay un
   camino real: pedir acceso, un admin decide en Usuarios > Solicitudes de acceso. La
   identidad (sub/email/name) vive en una cookie httpOnly de corta duracion
   (server-lib/oidc.js, buildPendingCookie) -- esta pagina nunca la ve directo, solo lo que
   /api/auth/oidc/pending devuelve. */
export default function RequestAccessPage() {
  const { t } = useTranslation('auth')

  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(null) // { email, name, existingRequest }
  const [notFound, setNotFound] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(null) // request devuelto tras submit
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/oidc/pending', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        setPending(data)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/oidc/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note: note.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'error')
      setSubmitted(data.request)
    } catch {
      setError(t('requestAccessSubmitError'))
    } finally {
      setSubmitting(false)
    }
  }

  const existing = submitted
    ? { status: submitted.status }
    : pending?.existingRequest || null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px] rounded-[30px] border border-border bg-card p-6 text-foreground sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <BrandLogo variant="login" />
        </div>

        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && notFound && (
          <>
            <Alert variant="destructive" className="mb-4">
              {t('requestAccessExpired')}
            </Alert>
            <Button asChild size="lg" className="w-full font-bold">
              <a href="/login">{t('requestAccessBackToLogin')}</a>
            </Button>
          </>
        )}

        {!loading && !notFound && pending && (
          <>
            <p className="mb-1 text-center text-[15px] font-bold">
              {t('requestAccessTitle')}
            </p>
            <p className="mb-5 text-center text-[13px] text-muted-foreground">
              {t('requestAccessSubtitle', { name: pending.name || pending.email })}
            </p>

            {existing?.status === 'PENDING' && (
              <Alert className="mb-4">{t('requestAccessPendingNotice')}</Alert>
            )}
            {existing?.status === 'DENIED' && !submitted && (
              <Alert variant="destructive" className="mb-4">
                {t('requestAccessDeniedNotice')}
              </Alert>
            )}

            {!existing || existing.status === 'DENIED' ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="request-note">{t('requestAccessNoteLabel')}</Label>
                  <Input
                    id="request-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={submitting}
                    placeholder={t('requestAccessNotePlaceholder')}
                  />
                </div>
                {error && <Alert variant="destructive">{error}</Alert>}
                <Button type="submit" size="lg" disabled={submitting} className="font-bold">
                  {submitting ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : (
                    t('requestAccessSubmitButton')
                  )}
                </Button>
              </form>
            ) : (
              <Button asChild variant="outline" size="lg" className="w-full font-bold">
                <a href="/login">{t('requestAccessBackToLogin')}</a>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
