import { eq } from 'drizzle-orm'
import { db, user } from '../../server-lib/db/client.js'
import { requireModuleAccess, publicUser } from '../../server-lib/auth.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

// 2026-09-07 (a peticion explicita del usuario, "solo yo 3647 pueda eliminar usuarios... que de
// verdad se borre desde la db"): unico numero de empleado autorizado a borrar cuentas de forma
// permanente. Hardcodeado a proposito (no es un permiso de RoleModulePermissions/UserPermissionOverride
// como el resto del modulo) -- el usuario pidio que sea EXCLUSIVAMENTE el, sin importar rol de
// quien mas sea ADMINISTRADOR despues.
const DELETE_USERS_EMPLOYEE_NUMBER = '3647'

async function handleDelete(req, res, id) {
  if (req.user.employeeNumber !== DELETE_USERS_EMPLOYEE_NUMBER) {
    return res.status(403).json({ error: 'Solo el usuario 3647 puede eliminar usuarios.' })
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' })
  }
  try {
    const [deleted] = await db.delete(user).where(eq(user.id, id)).returning()
    if (!deleted) return res.status(404).json({ error: 'Usuario no encontrado' })
    return res.status(200).json({ user: publicUser(deleted) })
  } catch (e) {
    // 23503 = foreign_key_violation (Postgres): el usuario creo registros historicos reales
    // (auditorias/demoras/equipo/etc, onDelete:'restrict' a proposito en schema.js para nunca
    // perder ese historial) -- nunca se intenta un cascade automatico que borraria datos de
    // produccion reales sin que nadie lo haya pedido explicitamente.
    if (e.code === '23503') {
      return res.status(409).json({
        error:
          'No se puede eliminar: este usuario tiene registros históricos asociados (auditorías, demoras, equipo, etc.). Desactívalo en su lugar.',
      })
    }
    throw e
  }
}

export default requireModuleAccess('/usuarios', async (req, res) => {
  const id = req.query.id ?? req.params?.id

  if (req.method === 'DELETE') return handleDelete(req, res, id)
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { name, employeeNumber, username, role, active, employeeId } = req.body || {}

  // NOTA (fase 3, Prisma -> Drizzle): User.updatedAt no tiene default de Postgres (era
  // @updatedAt del cliente Prisma) -- se pone a mano en TODO update, igual que antes se
  // actualizaba automaticamente en cualquier prisma.user.update, incluso con data={}.
  const data = { updatedAt: new Date() }
  if (name !== undefined) data.name = name
  if (employeeNumber !== undefined) data.employeeNumber = employeeNumber || null
  if (username !== undefined) data.username = username || null
  if (employeeId !== undefined) data.employeeId = employeeId || null
  if (active !== undefined) data.active = active
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido' })
    data.role = role
  }

  try {
    const [updated] = await db.update(user).set(data).where(eq(user.id, id)).returning()
    // Fase 3 (Prisma -> Drizzle): P2025 (Prisma, "record not found") -> Drizzle simplemente
    // devuelve 0 filas de `.returning()`, no lanza -- se checa explicitamente.
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' })
    return res.status(200).json({ user: publicUser(updated) })
  } catch (e) {
    // P2002 (Prisma) -> 23505 unique_violation (pg nativo), mismo criterio que api/users/index.js.
    if (e.code === '23505') {
      const target = e.constraint?.replace(/^User_/, '').replace(/_key$/, '') ?? 'valor unico'
      return res.status(409).json({ error: `Ya existe un usuario con ese ${target}` })
    }
    throw e
  }
})
