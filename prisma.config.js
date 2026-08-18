import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// El proyecto usa .env.local (convención de Vite), no .env — dotenv/config por defecto
// solo carga .env, así que lo apuntamos explícitamente. En Vercel esto simplemente no
// encuentra el archivo (no se commitea) y no hace nada — ahí las variables ya vienen
// inyectadas por la plataforma.
config({ path: '.env.local' })

// IMPORTANTE: no usar el helper env() de Prisma aquí — lanza una excepción en cuanto se
// carga este archivo si la variable no existe, y eso rompe hasta `prisma generate` (que ni
// siquiera necesita conexión real a la DB) cuando la variable no está presente.
// Neon/Vercel nunca crean una variable literal "DIRECT_URL": generan DATABASE_URL_UNPOOLED
// (o, en proyectos con la plantilla de Vercel Postgres, POSTGRES_URL_NON_POOLING). Por eso
// se resuelve con fallback en vez de asumir un solo nombre.
const directUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Usada solo por la CLI de Prisma (format/validate/migrate), nunca por el runtime de la app.
    // El runtime (API routes) usa el driver adapter con DATABASE_URL directamente.
    url: directUrl,
  },
})
