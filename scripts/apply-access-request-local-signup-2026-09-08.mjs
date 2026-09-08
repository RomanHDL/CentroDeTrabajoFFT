// Aplica manualmente drizzle/0014_access_request_local_signup.sql -- mismo motivo que los
// scripts apply-*.mjs anteriores (drizzle-kit generate pide un resolver interactivo en este
// entorno sin TTY -- migracion escrita a mano siguiendo el mismo estilo que 0004). Migracion
// puramente aditiva/de relajacion de NOT NULL (AccessRequest.oidcSub/email pasan a
// nullable + AccessRequest.employeeNumber nueva, nullable) -- no toca ni borra ningun dato
// existente. Idempotente: si la columna ya existe, se detiene sin error.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns
  WHERE table_name = 'AccessRequest' AND column_name = 'employeeNumber'`)
if (rows.length > 0) {
  console.log('[SKIP] AccessRequest.employeeNumber ya existe -- migracion ya aplicada.')
  await pool.end()
  process.exit(0)
}

const sql = readFileSync(
  new URL('../drizzle/0014_access_request_local_signup.sql', import.meta.url),
  'utf8',
)
const statements = sql.split('--> statement-breakpoint').map((s) => s.trim())
for (const stmt of statements) {
  if (!stmt) continue
  await pool.query(stmt)
  console.log('[OK] Ejecutado:', stmt.slice(0, 80).replace(/\n/g, ' '), '...')
}

console.log('[DONE] AccessRequest.oidcSub/email nullable + AccessRequest.employeeNumber agregados.')
await pool.end()
