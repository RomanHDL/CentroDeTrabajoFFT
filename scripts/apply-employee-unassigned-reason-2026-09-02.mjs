// Aplica manualmente drizzle/0003_add_employee_unassigned_reason.sql -- mismo motivo que los
// scripts apply-audit-evaluation-*.mjs anteriores (drizzle-kit migrate se queda colgado sin
// salida en este entorno). Migracion puramente aditiva (columnas nuevas nullable + 1 enum
// nuevo) -- no toca ni borra ningun dato existente. Idempotente: si el enum/columna ya existen,
// se detiene sin error.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns
  WHERE table_name = 'Employee' AND column_name = 'unassignedReason'`)
if (rows.length > 0) {
  console.log('[SKIP] Employee.unassignedReason ya existe -- migracion ya aplicada.')
  await pool.end()
  process.exit(0)
}

const sql = readFileSync(
  new URL('../drizzle/0003_add_employee_unassigned_reason.sql', import.meta.url),
  'utf8',
)
const statements = sql.split('--> statement-breakpoint').map((s) => s.trim())
for (const stmt of statements) {
  if (!stmt) continue
  await pool.query(stmt)
  console.log('[OK] Ejecutado:', stmt.slice(0, 80).replace(/\n/g, ' '), '...')
}

console.log('[DONE] Employee.unassignedReason + columnas relacionadas agregadas.')
await pool.end()
