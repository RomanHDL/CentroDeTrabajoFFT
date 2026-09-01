// Fase 5 (OIDC) -- SSO real de Nextcloud, en paralelo al login local (ver
// api/auth/login.js, que NO cambia). Igual que server-lib/sentry.js: no-op
// seguro mientras no existan las 4 variables reales
// (OIDC_ISSUER_URL/OIDC_CLIENT_ID/OIDC_CLIENT_SECRET/OIDC_REDIRECT_URI) --
// nunca rompe la app por falta de config, esas credenciales solo las puede
// emitir un administrador del Nextcloud real (ver checklist entregado al
// usuario).

import { parseCookie, stringifySetCookie } from 'cookie'
import jwt from 'jsonwebtoken'
import * as client from 'openid-client'
import { isHttpsEnvironment } from './auth.js'

const TXN_COOKIE_NAME = 'oidc_txn'
const TXN_TTL_SECONDS = 5 * 60 // solo dura el ida-y-vuelta con Nextcloud

export function isOidcConfigured() {
  return Boolean(
    process.env.OIDC_ISSUER_URL &&
      process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_REDIRECT_URI,
  )
}

// Cache del discovery document por proceso -- mismo patron singleton que
// server-lib/db/client.js (globalForDb), evita re-descubrir el issuer en
// cada login.
const globalForOidc = globalThis
async function getOidcConfig() {
  if (!globalForOidc.__fftOidcConfig) {
    globalForOidc.__fftOidcConfig = await client.discovery(
      new URL(process.env.OIDC_ISSUER_URL),
      process.env.OIDC_CLIENT_ID,
      process.env.OIDC_CLIENT_SECRET,
    )
  }
  return globalForOidc.__fftOidcConfig
}

// El code_verifier/state de PKCE viajan en una cookie httpOnly firmada
// (JWT de vida muy corta, mismo mecanismo que ya usa server-lib/auth.js
// para la sesion) -- Vercel/Coolify son procesos sin estado entre request
// de /start y de /callback, no hay sesion de servidor donde guardarlos.
export function buildTxnCookie(payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TXN_TTL_SECONDS })
  return stringifySetCookie({
    name: TXN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsEnvironment(),
    path: '/api/auth/oidc',
    maxAge: TXN_TTL_SECONDS,
  })
}

export function buildClearTxnCookie() {
  return stringifySetCookie({
    name: TXN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsEnvironment(),
    path: '/api/auth/oidc',
    maxAge: 0,
  })
}

export function readTxnCookie(req) {
  const cookies = parseCookie(req.headers?.cookie || '')
  const token = cookies[TXN_COOKIE_NAME]
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }
}

export async function buildAuthorizationRedirectUrl({ state, codeChallenge }) {
  const config = await getOidcConfig()
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: process.env.OIDC_REDIRECT_URI,
    scope: 'openid profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })
  return url.href
}

// currentUrl debe incluir el querystring completo del callback (code/state)
// tal como lo mando Nextcloud.
export async function exchangeAuthorizationCode({ currentUrl, codeVerifier, expectedState }) {
  const config = await getOidcConfig()
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState,
  })
  return tokens.claims()
}
