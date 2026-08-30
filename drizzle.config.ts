import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// .env.local sigue siendo la unica fuente de secretos en desarrollo.
config({ path: '.env.local' })

const directUrl: string | undefined =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL

export default defineConfig({
  dialect: 'postgresql',
  schema: './server-lib/db/schema.js',
  out: './drizzle',
  dbCredentials: {
    url: directUrl as string,
  },
  // Fase 3 (Prisma -> Drizzle) ya se completo por entero -- prisma.config.js
  // y @prisma/* ya no existen en el repo. _prisma_migrations puede seguir
  // viva como tabla de bookkeeping HISTORICA dentro de la base de datos real
  // (Neon) hasta que alguien la borre manualmente ahi; se sigue excluyendo
  // del diff de Drizzle para que un futuro `generate` nunca proponga
  // borrarla por error.
  tablesFilter: ['!_prisma_migrations'],
})
