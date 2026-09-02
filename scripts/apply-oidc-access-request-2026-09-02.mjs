// Aplica manualmente drizzle/0004_large_wendell_rand.sql -- mismo motivo que los scripts
// apply-*-2026-09-02.mjs anteriores (drizzle-kit migrate se queda colgado sin salida en este
// entorno). Migracion puramente aditiva (tabla AccessRequest nueva + columna User.oidcSub
// nullable) -- no toca ni borra ningun dato existente. Idempotente: si la tabla/columna ya
// existen, se detiene sin error.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns
  WHERE table_name = 'User' AND column_name = 'oidcSub'`)
if (rows.length > 0) {
  console.log('[SKIP] User.oidcSub ya existe -- migracion ya aplicada.')
  await pool.end()
  process.exit(0)
}

const sql = readFileSync(
  new URL('../drizzle/0004_large_wendell_rand.sql', import.meta.url),
  'utf8',
)
const statements = sql.split('--> statement-breakpoint').map((s) => s.trim())
for (const stmt of statements) {
  if (!stmt) continue
  await pool.query(stmt)
  console.log('[OK] Ejecutado:', stmt.slice(0, 80).replace(/\n/g, ' '), '...')
}

console.log('[DONE] AccessRequest + User.oidcSub agregados.')
await pool.end()
