// Aprobar/rechazar/vincular una solicitud de acceso via SSO (2026-09-02, apps.mi2.com.mx/stack
// seccion 7c, adaptado -- ver contexto en schema.js/AccessRequest). Aprobar NO otorga un
// scope nuevo: crea un User real con el rol que el admin elija aqui mismo, exactamente la
// misma insercion que ya hace api/users/index.js (POST), mas oidcSub de la solicitud --
// el login de esta persona sera siempre por SSO de ahi en adelante (password hash aleatorio,
// nunca comunicado -- no hay login local posible sin saberlo, ni falta: el flujo real es
// Nextcloud).
//
// 2026-09-07 (bug real en vivo -- Roman, admin ya existente con cuenta local de siempre,
// probo el login SSO por primera vez y cayo en "Solicitar acceso" como si fuera alguien
// nuevo): esperado, no un problema de seguridad -- su cuenta local nunca tuvo oidcSub, asi
// que el callback (api/auth/oidc/callback.js) nunca la reconocio. "Aprobar" SIEMPRE creaba
// un User nuevo, lo que le hubiera dejado una cuenta 3647 duplicada. Se agrega action='link'
// (mismo endpoint, misma solicitud): en vez de insertar, hace UPDATE de oidcSub sobre un User
// YA EXISTENTE (userId en el body) -- para vincular la identidad de Nextcloud a una cuenta que
// ya tenia password local, sin crear una segunda cuenta para la misma persona.
//
// 2026-09-08 (a peticion explicita del usuario, segundo origen de solicitud -- ver
// api/auth/request-access.js): una solicitud LOCAL (reqRow.employeeNumber lleno, oidcSub
// null) se distingue de una SSO (oidcSub lleno) por cual de los 2 viene lleno, nunca un
// campo aparte. "Aprobar" sobre una solicitud LOCAL es distinto: la cuenta SI hara login
// local de verdad, asi que necesita una contraseña real que el admin escribe aqui mismo (no
// una aleatoria) y mustChangePassword=true (mismo criterio que crear un usuario a mano en
// Usuarios); el numero de empleado viene fijo de la solicitud, nunca de lo que el admin
// escriba en el body. Tambien hace falta un `name` real -- Nextcloud lo manda solo, un
// numero de empleado no trae nombre, asi que el admin lo escribe en el mismo formulario de
// aprobar.
import crypto from 'node:crypto'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { publicUser, requireModuleAccess } from '../../../server-lib/auth.js'
import { accessRequest, db, user as userTable } from '../../../server-lib/db/client.js'
import { pgError } from '../../../server-lib/db/pgError.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // 2026-09-07 (bug real en vivo, encontrado al probar 'link'): este era el UNICO endpoint
  // dinamico de todo /api que leia `const { id } = req.query` sin el fallback `?? req.params?.id`
  // (ver la convencion real en server-lib/api-routes.js y en cualquier otro api/**/[id].js) --
  // en Vercel Express inyecta el segmento dinamico en req.query y por eso nunca se noto, pero en
  // Coolify/dev (Express real, sin ese comportamiento) req.query.id siempre fue undefined:
  // "Aprobar"/"Rechazar" solicitudes de acceso nunca funciono ahi, solo en Vercel.
  const id = req.query.id ?? req.params?.id
  const { action, role, employeeNumber, employeeId, userId, name, password } = req.body || {}
  if (action !== 'approve' && action !== 'deny' && action !== 'link') {
    return res.status(400).json({ error: "action debe ser 'approve', 'deny' o 'link'" })
  }

  const [reqRow] = await db.select().from(accessRequest).where(eq(accessRequest.id, id)).limit(1)
  if (!reqRow) return res.status(404).json({ error: 'Solicitud no encontrada.' })
  if (reqRow.status !== 'PENDING') {
    return res.status(409).json({ error: `La solicitud ya está ${reqRow.status}.` })
  }

  if (action === 'deny') {
    const [updated] = await db
      .update(accessRequest)
      .set({ status: 'DENIED', decidedByUserId: req.user.id, decidedAt: new Date() })
      .where(eq(accessRequest.id, id))
      .returning()
    return res.status(200).json({ status: 'DENIED', request: updated })
  }

  if (action === 'link') {
    if (!userId) return res.status(400).json({ error: 'Falta userId' })
    const [targetUser] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1)
    if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado' })

    let linkedUser
    try {
      ;[linkedUser] = await db
        .update(userTable)
        .set({ oidcSub: reqRow.oidcSub, updatedAt: new Date() })
        .where(eq(userTable.id, userId))
        .returning()
    } catch (e) {
      const pgErr = pgError(e)
      if (pgErr.code === '23505') {
        return res
          .status(409)
          .json({ error: 'Esa identidad de Nextcloud ya está vinculada a otra cuenta.' })
      }
      throw e
    }

    const [updatedRequest] = await db
      .update(accessRequest)
      .set({ status: 'APPROVED', decidedByUserId: req.user.id, decidedAt: new Date() })
      .where(eq(accessRequest.id, id))
      .returning()

    return res
      .status(200)
      .json({ status: 'APPROVED', request: updatedRequest, user: publicUser(linkedUser) })
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' })
  }

  const isLocal = Boolean(reqRow.employeeNumber)
  const finalName = (name || reqRow.name || reqRow.email || '').trim()
  if (!finalName) {
    return res.status(400).json({ error: 'Falta el nombre de la persona.' })
  }

  let passwordHash
  if (isLocal) {
    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'La contraseña temporal debe tener al menos 8 caracteres' })
    }
    passwordHash = await bcrypt.hash(password, 12)
  } else {
    // Cuenta SSO: el login real es siempre por Nextcloud, este hash nunca se comunica ni se
    // usa -- solo existe porque User.passwordHash es NOT NULL.
    passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
  }

  let createdUser
  try {
    ;[createdUser] = await db
      .insert(userTable)
      .values({
        employeeNumber: isLocal ? reqRow.employeeNumber : employeeNumber || null,
        username: null,
        name: finalName,
        role,
        passwordHash,
        active: true,
        mustChangePassword: isLocal,
        employeeId: employeeId || null,
        oidcSub: reqRow.oidcSub || null,
        updatedAt: new Date(),
      })
      .returning()
  } catch (e) {
    const pgErr = pgError(e)
    if (pgErr.code === '23505') {
      const target = pgErr.constraint?.replace(/^User_/, '').replace(/_key$/, '') ?? 'valor único'
      return res.status(409).json({ error: `Ya existe un usuario con ese ${target}` })
    }
    throw e
  }

  const [updatedRequest] = await db
    .update(accessRequest)
    .set({ status: 'APPROVED', decidedByUserId: req.user.id, decidedAt: new Date() })
    .where(eq(accessRequest.id, id))
    .returning()

  return res
    .status(200)
    .json({ status: 'APPROVED', request: updatedRequest, user: publicUser(createdUser) })
})
