// Reglas de negocio para "estaciones configurables por ADMINISTRADOR" (WC LINEA 0-10,
// 2026-08-27, a peticion explicita del usuario). Las invariantes viven aqui, no en las rutas de
// api/work-areas/[code]/workstations/* -- mismo criterio que server-lib/permissionService.js
// ("ADMINISTRADOR no puede quedar sin un modulo protegido" vive en el service, no en la ruta).
//
// IMPORTANTE (ver nota en src/data/personnel/workstations.js): `name` es la clave real que ya usan
// DailyAssignment/EmployeeMovement/EmployeeSkill para resolver una estacion (no `id`). Por eso
// renombrar o reducir la capacidad de un puesto con personal ACTIVE asignado sigue bloqueado aqui.
//
// 2026-08-28 ("CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a peticion explicita del usuario):
// DESACTIVAR (soft-delete) un puesto YA NO se bloquea por ocupacion. Investigado: la ocupacion que
// este archivo consulta (DailyAssignment en Postgres) es un espejo de sincronizacion en segundo
// plano (apiSync.js) de lo que en realidad ve/usa la app (localStorage, repository.js) -- no es la
// fuente confiable para decidir si alguien "se pierde". Con getPeopleWithoutStation
// (personnelByArea.js) ya no hace falta bloquear: si el puesto desaparece y alguien lo ocupaba,
// esa persona simplemente deja de encontrar una estacion real y aparece en "Personal sin estación"
// dentro de su misma WC -- su asignacion real (localStorage/DailyAssignment/EmployeeMovement)
// nunca se toca, nunca se borra, nunca se mueve sola. El aviso al ADMINISTRADOR (con el nombre real
// de a quien afecta) se muestra en el cliente ANTES de llamar a este endpoint
// (LineStationConfigDrawer.jsx), usando los datos que ya tiene en pantalla (localStorage), no una
// segunda consulta a Postgres.
//
// Fase 3 (MI Stack Reference, Prisma -> Drizzle): mismo comportamiento linea
// por linea que el archivo original (ver git history). `createWorkstations`
// mejora de forma segura: el array-of-promises `$transaction` de Prisma se
// vuelve un solo INSERT de multiples filas (Drizzle lo soporta nativo,
// sigue siendo atomico) -- `reorderWorkstations` SI necesita una
// transaccion real porque cada fila recibe un displayOrder distinto.
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import { db, workArea, workstation, dailyAssignment } from './db/client.js'
export async function resolveWorkArea(codeOrId) {
  const [area] = await db
    .select()
    .from(workArea)
    .where(or(eq(workArea.code, codeOrId), eq(workArea.id, codeOrId)))
    .limit(1)
  return area || null
}
export function serializeWorkstation(w) {
  return {
    id: w.id,
    name: w.name,
    role: w.role,
    requiredRole: w.requiredRoleLabel,
    category: w.category,
    capacity: w.capacity,
    order: w.displayOrder,
    status: 'ACTIVA',
  }
}
export async function listWorkstations(workAreaId) {
  return db
    .select()
    .from(workstation)
    .where(and(eq(workstation.workAreaId, workAreaId), eq(workstation.active, true)))
    .orderBy(asc(workstation.displayOrder))
}
export async function nextDisplayOrder(workAreaId) {
  const [{ max }] = await db
    .select({ max: sql`max(${workstation.displayOrder})` })
    .from(workstation)
    .where(eq(workstation.workAreaId, workAreaId))
  return (max || 0) + 1
}
/* `quantity` > 1 reusa EXACTAMENTE la misma convencion de nombres que ya usa
   buildWorkstations/buildLineRolePlan para WC LINEA (workstations.js): la primera posicion
   conserva el nombre plano ("Montaje"), solo las repeticiones llevan sufijo ("Montaje 2", ...) --
   asi una linea configurada a mano queda indistinguible de una generada por el codigo. `role`
   (rol base, para agrupar/clasificar) es SIEMPRE el mismo string en las N posiciones creadas. */
export async function createWorkstations({
  workAreaId,
  baseName,
  requiredRoleLabel,
  category,
  capacity,
  quantity,
  displayOrderStart,
}) {
  const qty = Math.max(1, Math.min(20, Number(quantity) || 1))
  const cap = Math.max(1, Number(capacity) || 1)
  const rows = Array.from({ length: qty }, (_, i) => ({
    workAreaId,
    name: i === 0 ? baseName : `${baseName} ${i + 1}`,
    role: baseName,
    requiredRoleLabel: requiredRoleLabel || null,
    category: category || null,
    capacity: cap,
    displayOrder: displayOrderStart + i,
    active: true,
  }))
  return db.insert(workstation).values(rows).returning()
}
async function activeOccupancy(workstationId) {
  const [{ occupied }] = await db
    .select({ occupied: sql`count(*)::int` })
    .from(dailyAssignment)
    .where(
      and(eq(dailyAssignment.workstationId, workstationId), eq(dailyAssignment.status, 'ACTIVE')),
    )
  return occupied
}
export async function updateWorkstation(
  id,
  { name, requiredRoleLabel, category, capacity, displayOrder },
) {
  const data = {}
  if (requiredRoleLabel !== undefined) data.requiredRoleLabel = requiredRoleLabel || null
  if (category !== undefined) data.category = category || null
  if (displayOrder !== undefined) data.displayOrder = displayOrder
  if (name !== undefined) {
    const [current] = await db
      .select({ name: workstation.name })
      .from(workstation)
      .where(eq(workstation.id, id))
      .limit(1)
    if (current && current.name !== name) {
      const occupied = await activeOccupancy(id)
      if (occupied > 0) {
        const err = new Error(
          'No se puede renombrar un puesto que actualmente tiene personal asignado. Reasigna primero.',
        )
        err.code = 'OCCUPIED'
        throw err
      }
    }
    data.name = name
  }
  if (capacity !== undefined) {
    const occupied = await activeOccupancy(id)
    if (capacity < occupied) {
      const err = new Error(
        `No se puede reducir la capacidad por debajo del personal actualmente asignado (${occupied}).`,
      )
      err.code = 'CAPACITY_BELOW_OCCUPANCY'
      throw err
    }
    data.capacity = capacity
  }
  const [row] = await db.update(workstation).set(data).where(eq(workstation.id, id)).returning()
  return row
}
export async function deactivateWorkstation(id) {
  const [row] = await db
    .update(workstation)
    .set({ active: false })
    .where(eq(workstation.id, id))
    .returning()
  return row
}
export async function reorderWorkstations(workAreaId, orderedIds) {
  const rows = await db
    .select({ id: workstation.id, workAreaId: workstation.workAreaId })
    .from(workstation)
    .where(inArray(workstation.id, orderedIds))
  if (rows.length !== orderedIds.length || rows.some((r) => r.workAreaId !== workAreaId)) {
    const err = new Error('IDs de estacion invalidos para esta linea.')
    err.code = 'INVALID_IDS'
    throw err
  }
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i += 1) {
      await tx
        .update(workstation)
        .set({ displayOrder: i + 1 })
        .where(eq(workstation.id, orderedIds[i]))
    }
  })
  return listWorkstations(workAreaId)
}
