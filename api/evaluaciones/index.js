// Modulo Evaluaciones (2026-09-02, a peticion explicita del usuario):
// resultados reales de auditorias 5S ya completadas -- ver AuditEvaluation
// en server-lib/db/schema.js. GET lista (usado por EvaluacionesPage.jsx),
// POST guarda una auditoria recien terminada (usado por AuditoriaPage.jsx,
// FiveSDialog). scorePct se calcula SIEMPRE en el servidor a partir de las
// 5 clasificaciones reales enviadas -- nunca se confia en un numero que
// mande el cliente, para que el puntaje guardado sea consistente con lo
// que de verdad se clasifico.
import { desc, eq } from 'drizzle-orm'
import { requireAuth } from '../../server-lib/auth.js'
import { auditEvaluation, db, employee } from '../../server-lib/db/client.js'
import { canUserAccessModule } from '../../server-lib/permissionService.js'

const CLASSIFICATIONS = new Set(['CUMPLE', 'CUMPLE_PARCIAL', 'NO_CUMPLE'])
const STEP_SCORE = { CUMPLE: 100, CUMPLE_PARCIAL: 50, NO_CUMPLE: 0 }
const STEPS = ['s1', 's2', 's3', 's4', 's5']

async function handleGet(req, res) {
  const { employeeId } = req.query || {}
  const rows = await db
    .select({
      id: auditEvaluation.id,
      employeeId: auditEvaluation.employeeId,
      employeeName: employee.fullName,
      employeeNumber: employee.employeeNumber,
      areaId: auditEvaluation.areaId,
      stationName: auditEvaluation.stationName,
      auditDate: auditEvaluation.auditDate,
      s1: auditEvaluation.s1,
      s2: auditEvaluation.s2,
      s3: auditEvaluation.s3,
      s4: auditEvaluation.s4,
      s5: auditEvaluation.s5,
      scorePct: auditEvaluation.scorePct,
      createdAt: auditEvaluation.createdAt,
    })
    .from(auditEvaluation)
    .innerJoin(employee, eq(employee.id, auditEvaluation.employeeId))
    .where(employeeId ? eq(auditEvaluation.employeeId, employeeId) : undefined)
    .orderBy(desc(auditEvaluation.auditDate), desc(auditEvaluation.createdAt))
  return res.status(200).json({ evaluations: rows })
}

async function handlePost(req, res) {
  const { employeeId, areaId, stationName, classifications } = req.body || {}
  if (!employeeId || !areaId || !stationName) {
    return res.status(400).json({ error: 'Faltan employeeId, areaId o stationName.' })
  }
  if (!classifications || STEPS.some((s) => !CLASSIFICATIONS.has(classifications[s]))) {
    return res.status(400).json({ error: 'Las 5 clasificaciones (s1..s5) son requeridas.' })
  }
  const [found] = await db.select().from(employee).where(eq(employee.id, employeeId)).limit(1)
  if (!found) return res.status(404).json({ error: 'Empleado no encontrado.' })

  const scorePct = Math.round(
    STEPS.reduce((sum, s) => sum + STEP_SCORE[classifications[s]], 0) / STEPS.length,
  )

  const [created] = await db
    .insert(auditEvaluation)
    .values({
      employeeId,
      areaId,
      stationName,
      auditDate: new Date(),
      s1: classifications.s1,
      s2: classifications.s2,
      s3: classifications.s3,
      s4: classifications.s4,
      s5: classifications.s5,
      scorePct,
      createdByUserId: req.user.id,
    })
    .returning()

  return res.status(201).json({ evaluation: created })
}

// GET lo consume EvaluacionesPage.jsx (modulo "/evaluaciones"); POST lo
// consume AuditoriaPage.jsx (modulo "/auditoria") al terminar una auditoria
// 5S -- son 2 modulos independientes en moduleRegistry.js, cada uno
// configurable por separado, asi que cada verbo se protege contra el
// modulo que realmente lo usa (nunca ambos contra el mismo).
export default requireAuth(async (req, res) => {
  if (req.method === 'POST') {
    const allowed = await canUserAccessModule({
      userId: req.user.id,
      role: req.user.role,
      moduleKey: '/auditoria',
    })
    if (!allowed) return res.status(403).json({ error: 'No autorizado para este modulo' })
    return handlePost(req, res)
  }
  if (req.method === 'GET') {
    const allowed = await canUserAccessModule({
      userId: req.user.id,
      role: req.user.role,
      moduleKey: '/evaluaciones',
    })
    if (!allowed) return res.status(403).json({ error: 'No autorizado para este modulo' })
    return handleGet(req, res)
  }
  return res.status(405).json({ error: 'Method not allowed' })
})
