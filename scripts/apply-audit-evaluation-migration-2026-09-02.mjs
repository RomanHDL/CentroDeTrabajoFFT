// Aplica manualmente drizzle/0001_add_audit_evaluation.sql -- drizzle-kit
// migrate se quedaba colgado sin salida (probablemente esperando
// confirmacion interactiva en stdin, que nunca llega en shell no
// interactivo). Idempotente: verifica que la tabla no exista antes de
// crearla, seguro de re-correr.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(`SELECT to_regclass('public."AuditEvaluation"') as exists`)
if (rows[0].exists) {
  console.log('[SKIP] La tabla AuditEvaluation ya existe.')
  await pool.end()
  process.exit(0)
}

const sql = readFileSync(
  new URL('../drizzle/0001_add_audit_evaluation.sql', import.meta.url),
  'utf8',
)
const statements = sql.split('--> statement-breakpoint').map((s) => s.trim())
for (const stmt of statements) {
  if (!stmt) continue
  await pool.query(stmt)
  console.log('[OK] Ejecutado:', stmt.slice(0, 70).replace(/\n/g, ' '), '...')
}

console.log('[DONE] Migracion AuditEvaluation aplicada.')
await pool.end()
