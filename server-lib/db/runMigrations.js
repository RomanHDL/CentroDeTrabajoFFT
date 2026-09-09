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
export async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const db = drizzle({ client: pool })
    await migrate(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle') })
    console.log('[migrate] schema al dia')
  } finally {
    await pool.end()
  }
}
