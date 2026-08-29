import jwt from 'jsonwebtoken'
import { stringifySetCookie, parseCookie } from 'cookie'
import { prisma } from './prisma.js'
import { canUserAccessModule } from './permissionService.js'

const COOKIE_NAME = 'fft_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 horas

function isHttpsEnvironment() {
  // Preview y Production de Vercel siempre son HTTPS; localhost no.
  return process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview'
}

export function signSessionToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS })
}

export function buildSessionCookie(token) {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsEnvironment(),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function buildClearSessionCookie() {
  return stringifySetCookie({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsEnvironment(),
    path: '/',
    maxAge: 0,
  })
}

function getTokenFromRequest(req) {
  const raw = req.headers?.cookie || ''
  const cookies = parseCookie(raw)
  return cookies[COOKIE_NAME]
}

// Decodifica el JWT SOLO para obtener el userId, y siempre vuelve a consultar User en DB
// para confirmar active/role actuales — nunca confia en lo que el token dice sobre el rol.
export async function getSessionUser(req) {
  const token = getTokenFromRequest(req)
  if (!token) return null

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return null
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.active) return null
  return user
}

export function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...safe } = user
  return safe
}

export function requireAuth(handler) {
  return async (req, res) => {
    const user = await getSessionUser(req)
    if (!user) return res.status(401).json({ error: 'No autenticado' })
    req.user = user
    return handler(req, res)
  }
}

export function requireRole(roles, handler) {
  return requireAuth(async (req, res) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado para esta accion' })
    }
    return handler(req, res)
  })
}

// Wrapper reutilizable para proteger un endpoint por modulo (rol + override
// individual, via canUserAccessModule/resolveEffectiveAccess) en vez de solo
// por rol fijo. Disponible para endpoints nuevos; NO se aplico hoy a
// api/personnel/* porque esos endpoints son compartidos entre varios modulos
// (Centro de Trabajo Y Registro de personal) y filtrarlos por un solo
// moduleKey queda fuera de alcance de esta tarea.
export function requireModuleAccess(moduleKey, handler) {
  return requireAuth(async (req, res) => {
    const allowed = await canUserAccessModule({
      userId: req.user.id,
      role: req.user.role,
      moduleKey,
    })
    if (!allowed) return res.status(403).json({ error: 'No autorizado para este modulo' })
    return handler(req, res)
  })
}
