import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'
import * as relations from './relations.js'
// Mismo patron singleton que server-lib/prisma.js (que sigue vivo hasta
// la fase 3f) -- evita agotar conexiones en dev (hot-reload) ni en
// funciones serverless reutilizadas entre invocaciones del mismo proceso.
const globalForDb = globalThis
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db =
  globalForDb.__fftDb ?? drizzle({ client: pool, schema: { ...schema, ...relations } })
if (process.env.NODE_ENV !== 'production') {
  globalForDb.__fftDb = db
}
export * from './schema.js'
