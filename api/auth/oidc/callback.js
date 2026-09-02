import { eq } from 'drizzle-orm'
import { buildSessionCookie, signSessionToken } from '../../../server-lib/auth.js'
import { db, user } from '../../../server-lib/db/client.js'
import {
  buildClearTxnCookie,
  buildPendingCookie,
  exchangeAuthorizationCode,
  isOidcConfigured,
  readTxnCookie,
} from '../../../server-lib/oidc.js'
import { captureException } from '../../../server-lib/sentry.js'

// 2026-09-02 (corregido segun apps.mi2.com.mx/stack, seccion 7): el match con la cuenta
// local es por User.oidcSub == claims.sub -- la identidad estable real del stack, NUNCA
// preferred_username (ese claim ni siquiera lo manda Nextcloud). Nunca se auto-crea un User
// aqui mismo: si no hay match, en vez de un error muerto se redirige al flujo de
// "Solicitar acceso" (RequestAccessPage.jsx) -- el admin sigue siendo quien decide el rol al
// aprobar, exactamente igual que hoy en Usuarios, solo que ahora hay un camino real para
// pedirlo en vez de un callejon sin salida.
function redirectToLogin(res, oidcError) {
  res.setHeader('Set-Cookie', buildClearTxnCookie())
  res.writeHead(302, { Location: `/login?oidc_error=${oidcError}` })
  res.end()
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isOidcConfigured()) return res.status(404).json({ error: 'SSO no configurado' })

  const txn = readTxnCookie(req)
  if (!txn) return redirectToLogin(res, 'txn_expired')

  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const currentUrl = new URL(req.url, `${protocol}://${req.headers.host}`)

  let identity
  try {
    identity = await exchangeAuthorizationCode({
      currentUrl,
      codeVerifier: txn.codeVerifier,
      expectedState: txn.state,
    })
  } catch (error) {
    captureException(error, { path: req.url })
    return redirectToLogin(res, 'exchange_failed')
  }

  if (!identity.email) return redirectToLogin(res, 'missing_email_claim')

  const [found] = await db.select().from(user).where(eq(user.oidcSub, identity.sub)).limit(1)
  if (found) {
    if (!found.active) return redirectToLogin(res, 'inactive_user')
    const token = signSessionToken(found.id)
    res.setHeader('Set-Cookie', [buildClearTxnCookie(), buildSessionCookie(token)])
    res.writeHead(302, { Location: '/' })
    return res.end()
  }

  // Sin match local -- primera vez que esta identidad entra por SSO. La pantalla de
  // "Solicitar acceso" necesita sub/email/name; el intercambio con Nextcloud ya terminó, asi
  // que viaja en su propia cookie (buildPendingCookie), no en la de txn (esa ya cumplio su
  // proposito de PKCE/state).
  res.setHeader('Set-Cookie', [buildClearTxnCookie(), buildPendingCookie(identity)])
  res.writeHead(302, { Location: '/solicitar-acceso' })
  res.end()
}
