import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Corre las migraciones SQL versionadas de drizzle/ contra DATABASE_URL en
// cada arranque del contenedor -- migrate() es idempotente (tabla de
// bookkeeping __drizzle_migrations), asi que contra un DB ya al dia es un
// no-op. Necesario porque nixpacks/Coolify no corre "drizzle-kit push" como
// parte del build (ver nixpacks.toml): antes de esto las migraciones nunca
// se aplicaban solas fuera de un `pnpm run db:push` manual contra Neon.
// Nunca debe tumbar el arranque del servidor (mismo criterio que
// personnel-sync en prod-server.js): si DATABASE_URL apunta a algo
// inalcanzable (ej. Neon sin cuota), la app debe seguir levantando -- las
// rutas que no tocan DB (login page, estaticos) tienen que seguir sirviendo
// en vez de crashear el proceso entero en un loop de reinicios.
export async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 8000 })
  try {
    const db = drizzle({ client: pool })
    await migrate(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle') })
    console.log('[migrate] schema al dia')
  } catch (e) {
    console.error('[migrate] error (servidor sigue levantando):', e.message)
  } finally {
    await pool.end().catch(() => {})
  }
}
