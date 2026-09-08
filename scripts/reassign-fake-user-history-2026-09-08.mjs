// Reasigna a Roman (employeeNumber 3647) todo el historial de las dos cuentas de prueba
// creadas al inicio del desarrollo -- "AgentIA" (1111) y "Lider" (0001), confirmadas por el
// usuario como NO empleados reales -- para poder eliminarlas permanentemente despues (el
// DELETE real las bloquea con 409 mientras tengan registros historicos con onDelete
// 'restrict'). Cubre TODAS las columnas de schema.js con FK a User.id (mas dos sin FK real
// pero que igual referencian un usuario: RoleModulePermission/UserModulePermission
// .updatedByUserId). UserModulePermission.userId se deja intacto a proposito: tiene onDelete
// 'cascade', asi que sus filas (permisos por-usuario de las cuentas falsas) deben borrarse
// solas junto con el usuario, no reasignarse a Roman.
import { db } from '../server-lib/db/client.js'

const FAKE_IDS = ['cmt26l4o6000004jrw8sda01b', 'cmt34p29p000004ktg6uhrnch'] // 1111 AgentIA, 0001 Lider
const REAL_ID = 'cmsyyxuia00006kldashukrjf' // 3647 Roman Herrera De Leon

const REASSIGNMENTS = [
  ['AccessRequest', 'decidedByUserId'],
  ['ImportBatch', 'triggeredByUserId'],
  ['EmployeeSkill', 'addedByUserId'],
  ['EmployeeSkill', 'deactivatedByUserId'],
  ['BajaConflict', 'resolvedByUserId'],
  ['EmployeeReconciliationCandidate', 'resolvedByUserId'],
  ['DailyAssignment', 'assignedByUserId'],
  ['DailyAssignment', 'endedByUserId'],
  ['EmployeeMovement', 'movedByUserId'],
  ['Attendance', 'registeredByUserId'],
  ['PendingMove', 'requestedByUserId'],
  ['PendingMove', 'resolvedByUserId'],
  ['RoleModulePermission', 'updatedByUserId'],
  ['UserModulePermission', 'updatedByUserId'],
  ['FiveSAudit', 'createdByUserId'],
  ['ProcessAudit', 'createdByUserId'],
  ['DowntimeRecord', 'createdByUserId'],
  ['EquipmentItem', 'createdByUserId'],
  ['EquipmentAudit', 'createdByUserId'],
  ['HourlyProductionSession', 'createdByUserId'],
  ['HourlyProductionSession', 'updatedByUserId'],
  ['HourlyProductionEntry', 'createdByUserId'],
  ['HourlyProductionEntry', 'updatedByUserId'],
  ['HourlyProductionIncident', 'updatedByUserId'],
  ['SortingSession', 'createdByUserId'],
  ['SortingSession', 'updatedByUserId'],
  ['SortingEntry', 'createdByUserId'],
  ['SortingEntry', 'updatedByUserId'],
]

let totalMoved = 0
for (const [tableName, column] of REASSIGNMENTS) {
  const result = await db.execute(
    `update "${tableName}" set "${column}" = '${REAL_ID}' where "${column}" = any('{${FAKE_IDS.join(',')}}')`,
  )
  const moved = result.rowCount ?? 0
  if (moved > 0) console.log(`${tableName}.${column}: ${moved} fila(s) reasignada(s)`)
  totalMoved += moved
}
console.log(`Total reasignado: ${totalMoved} fila(s)`)

// Verificacion: confirmar que ya no queda ninguna referencia a los IDs falsos en ninguna
// de las columnas cubiertas.
let remaining = 0
for (const [tableName, column] of REASSIGNMENTS) {
  const { rows } = await db.execute(
    `select count(*)::int as n from "${tableName}" where "${column}" = any('{${FAKE_IDS.join(',')}}')`,
  )
  remaining += rows[0].n
}
console.log(`Referencias restantes tras la reasignacion: ${remaining}`)

process.exit(0)
