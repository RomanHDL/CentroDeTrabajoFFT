import { eq } from 'drizzle-orm'
import { buildSessionCookie, signSessionToken } from '../../../server-lib/auth.js'
import { db, user } from '../../../server-lib/db/client.js'
import {
  buildClearTxnCookie,
  exchangeAuthorizationCode,
  isOidcConfigured,
  readTxnCookie,
} from '../../../server-lib/oidc.js'
import { captureException } from '../../../server-lib/sentry.js'

// Fase 5 (OIDC). El match con la cuenta local es por `username` == claim
// `preferred_username` del ID token -- la tabla User no tiene email (ver
// server-lib/db/schema.js) y esto evita una migracion de esquema. Nunca se
// auto-crea un User nuevo: si no hay match, el admin tiene que darlo de
// alta a mano en Usuarios, exactamente como hoy con el login local.
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

  let claims
  try {
    claims = await exchangeAuthorizationCode({
      currentUrl,
      codeVerifier: txn.codeVerifier,
      expectedState: txn.state,
    })
  } catch (error) {
    captureException(error, { path: req.url })
    return redirectToLogin(res, 'exchange_failed')
  }

  const username = claims.preferred_username
  if (!username) return redirectToLogin(res, 'missing_username_claim')

  const [found] = await db.select().from(user).where(eq(user.username, username)).limit(1)
  if (!found) return redirectToLogin(res, 'no_local_account')
  if (!found.active) return redirectToLogin(res, 'inactive_user')

  const token = signSessionToken(found.id)
  res.setHeader('Set-Cookie', [buildClearTxnCookie(), buildSessionCookie(token)])
  res.writeHead(302, { Location: '/' })
  res.end()
}
