// Migracion aditiva (2026-09-14, a peticion explicita y urgente del usuario -- "hoy es el
// primer dia real de Asistencia... como sabemos los que faltaron, vacaciones, incapacidades").
// UnassignedReason (enum real de Postgres, ver api/personnel/set-unassigned-reason.js) solo
// aceptaba BAJA/TURNO/FALTA -- se agregan 2 valores nuevos, VACACIONES/INCAPACIDAD, sin tocar
// ningun valor existente ni ninguna fila ya guardada (ALTER TYPE ... ADD VALUE nunca borra ni
// reescribe datos). `ADD VALUE IF NOT EXISTS` (soportado desde Postgres 12) hace esta migracion
// idempotente por si sola, sin necesitar un chequeo aparte antes de aplicarla.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db } from '../server-lib/db/client.js'

const sql = readFileSync(
  fileURLToPath(
    new URL('../drizzle/0018_unassigned_reason_vacaciones_incapacidad.sql', import.meta.url),
  ),
  'utf8',
)

const statements = sql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean)

for (const statement of statements) {
  console.log('Ejecutando:', statement)
  await db.execute(statement)
}

console.log('Migracion 0018 aplicada correctamente.')
process.exit(0)
