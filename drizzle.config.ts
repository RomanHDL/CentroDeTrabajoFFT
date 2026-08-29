import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// Mismo patron que prisma.config.js (no se toca ese archivo hasta que
// Prisma se retire del todo -- fase 3f). .env.local sigue siendo la
// unica fuente de secretos en desarrollo.
config({ path: '.env.local' })

const directUrl: string | undefined =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL

export default defineConfig({
  dialect: 'postgresql',
  schema: './server-lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: directUrl as string,
  },
  // _prisma_migrations es la tabla de bookkeeping interna de Prisma (se
  // mantiene mientras Prisma siga presente, fase 3f la retira) -- nunca
  // debe ser parte del schema/diff de Drizzle, para que un futuro
  // `generate` jamas proponga borrarla.
  tablesFilter: ['!_prisma_migrations'],
})
