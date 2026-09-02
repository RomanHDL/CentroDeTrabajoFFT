// Aprobar/rechazar una solicitud de acceso via SSO (2026-09-02, apps.mi2.com.mx/stack
// seccion 7c, adaptado -- ver contexto en schema.js/AccessRequest). Aprobar NO otorga un
// scope nuevo: crea un User real con el rol que el admin elija aqui mismo, exactamente la
// misma insercion que ya hace api/users/index.js (POST), mas oidcSub de la solicitud --
// el login de esta persona sera siempre por SSO de ahi en adelante (password hash aleatorio,
// nunca comunicado -- no hay login local posible sin saberlo, ni falta: el flujo real es
// Nextcloud).
import crypto from 'node:crypto'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { publicUser, requireModuleAccess } from '../../../server-lib/auth.js'
import { accessRequest, db, user as userTable } from '../../../server-lib/db/client.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  const { action, role, employeeNumber, employeeId } = req.body || {}
  if (action !== 'approve' && action !== 'deny') {
    return res.status(400).json({ error: "action debe ser 'approve' o 'deny'" })
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

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' })
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)
  let createdUser
  try {
    ;[createdUser] = await db
      .insert(userTable)
      .values({
        employeeNumber: employeeNumber || null,
        username: null,
        name: reqRow.name || reqRow.email,
        role,
        passwordHash,
        active: true,
        mustChangePassword: false,
        employeeId: employeeId || null,
        oidcSub: reqRow.oidcSub,
        updatedAt: new Date(),
      })
      .returning()
  } catch (e) {
    if (e.code === '23505') {
      const target = e.constraint?.replace(/^User_/, '').replace(/_key$/, '') ?? 'valor único'
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
