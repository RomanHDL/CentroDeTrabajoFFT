// Aplica manualmente drizzle/0002_simplify_audit_evaluation_area_only.sql
// -- mismo motivo que scripts/apply-audit-evaluation-migration-2026-09-02.mjs
// (drizzle-kit migrate se queda colgado sin salida en este entorno).
// AuditEvaluation estaba vacia (0 filas, verificado antes de correr esto) --
// seguro quitar employeeId/stationName sin perder ningun dato real.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns
  WHERE table_name = 'AuditEvaluation' AND column_name = 'employeeId'`)
if (rows.length === 0) {
  console.log('[SKIP] AuditEvaluation ya no tiene employeeId -- migracion ya aplicada.')
  await pool.end()
  process.exit(0)
}

const sql = readFileSync(
  new URL('../drizzle/0002_simplify_audit_evaluation_area_only.sql', import.meta.url),
  'utf8',
)
const statements = sql.split('--> statement-breakpoint').map((s) => s.trim())
for (const stmt of statements) {
  if (!stmt) continue
  await pool.query(stmt)
  console.log('[OK] Ejecutado:', stmt.slice(0, 80).replace(/\n/g, ' '), '...')
}

console.log('[DONE] AuditEvaluation simplificada a solo area.')
await pool.end()
