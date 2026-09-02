// SSO real de Nextcloud (apps.mi2.com.mx/stack seccion 7) -- reemplaza el login local
// (api/auth/login.js, sin cambios ahi) en cuanto esta configurado, ver LoginPage.jsx. Igual
// que server-lib/sentry.js: no-op seguro mientras no existan las 4 variables reales
// (OIDC_ISSUER_URL/OIDC_CLIENT_ID/OIDC_CLIENT_SECRET/OIDC_REDIRECT_URI) -- nunca rompe la
// app por falta de config, esas credenciales solo las puede emitir un administrador del
// Nextcloud real.

import { parseCookie, stringifySetCookie } from 'cookie'
import jwt from 'jsonwebtoken'
import * as client from 'openid-client'
import { isHttpsEnvironment } from './auth.js'

const TXN_COOKIE_NAME = 'oidc_txn'
const TXN_TTL_SECONDS = 5 * 60 // solo dura el ida-y-vuelta con Nextcloud

// Identidad pendiente (2026-09-02, flujo de "Solicitar acceso"): tras el intercambio de
// codigo, si claims.sub no matchea ningun User local, el callback redirige a
// RequestAccessPage.jsx -- esa pagina necesita sub/email/name pero YA NO tiene el
// code_verifier (el intercambio con Nextcloud ya se completo). Cookie separada, TTL mas
// largo que TXN (da tiempo real a leer la pantalla y decidir si pedir acceso).
const PENDING_COOKIE_NAME = 'oidc_pending'
const PENDING_TTL_SECONDS = 15 * 60

export function isOidcConfigured() {
  return Boolean(
    process.env.OIDC_ISSUER_URL &&
      process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_REDIRECT_URI,
  )
}

// Cache del discovery document por proceso -- mismo patron singleton que
// server-lib/db/client.js (globalForDb), evita re-descubrir el issuer en cada login.
//
// NO se usa client.discovery() (2026-09-02, corregido segun apps.mi2.com.mx/stack): esa
// funcion asume `${issuer}/.well-known/openid-configuration`, pero el discovery real de
// Nextcloud vive en una ruta no estandar, `/index.php/apps/oidc/openid-configuration` --
// documentado tal cual en el stack. openid-client v6 SI permite construir la
// `Configuration` directo desde un ServerMetadata ya resuelto (confirmado en
// node_modules/openid-client/build/index.d.ts, constructor de la clase Configuration), asi
// que aqui se hace el fetch a mano a la ruta real y se construye con eso.
const globalForOidc = globalThis
async function getOidcConfig() {
  if (!globalForOidc.__fftOidcConfig) {
    const discoveryUrl = new URL(
      '/index.php/apps/oidc/openid-configuration',
      process.env.OIDC_ISSUER_URL,
    )
    const res = await fetch(discoveryUrl)
    if (!res.ok) {
      throw new Error(`No se pudo obtener el discovery document de Nextcloud (${res.status})`)
    }
    const serverMetadata = await res.json()
    globalForOidc.__fftOidcConfig = new client.Configuration(
      serverMetadata,
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

// Identidad pendiente tras un callback sin match local -- ver PENDING_COOKIE_NAME arriba.
// payload: { sub, email, name }.
export function buildPendingCookie(payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: PENDING_TTL_SECONDS })
  return stringifySetCookie({
    name: PENDING_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsEnvironment(),
    path: '/api/auth/oidc',
    maxAge: PENDING_TTL_SECONDS,
  })
}

export function buildClearPendingCookie() {
  return stringifySetCookie({
    name: PENDING_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsEnvironment(),
    path: '/api/auth/oidc',
    maxAge: 0,
  })
}

export function readPendingCookie(req) {
  const cookies = parseCookie(req.headers?.cookie || '')
  const token = cookies[PENDING_COOKIE_NAME]
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
    // 'email' agregado 2026-09-02 (stack): sin este scope Nextcloud ni siquiera expone el
    // email via fetchUserInfo -- ver abajo.
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  })
  return url.href
}

// currentUrl debe incluir el querystring completo del callback (code/state)
// tal como lo mando Nextcloud.
//
// Devuelve { sub, email, name } ya resuelto (2026-09-02, corregido segun el stack): el ID
// token de Nextcloud NUNCA trae `email` (solo profile/sub/name) -- hay que pedirlo aparte
// via fetchUserInfo() con el access_token. Nunca se usa `sub` como fallback de email ni se
// omite -- quien llama (api/auth/oidc/callback.js) depende de un email real para el flujo
// de "Solicitar acceso" (mostrarlo, notificar por Mattermost).
export async function exchangeAuthorizationCode({ currentUrl, codeVerifier, expectedState }) {
  const config = await getOidcConfig()
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState,
  })
  const claims = tokens.claims()
  if (!claims?.sub) throw new Error('El ID token de Nextcloud no trae claim sub.')

  let email = typeof claims.email === 'string' ? claims.email : ''
  let name = typeof claims.name === 'string' ? claims.name : undefined
  if (!email && tokens.access_token) {
    const userinfo = await client.fetchUserInfo(config, tokens.access_token, claims.sub)
    if (typeof userinfo.email === 'string') email = userinfo.email
    if (!name && typeof userinfo.name === 'string') name = userinfo.name
  }

  return { sub: claims.sub, email, name }
}
