import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// El proyecto usa .env.local (convención de Vite), no .env — dotenv/config por defecto
// solo carga .env, así que lo apuntamos explícitamente.
config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Usada solo por la CLI de Prisma (format/validate/migrate), nunca por el runtime de la app.
    // El runtime (API routes) usa el driver adapter con DATABASE_URL directamente.
    url: env('DIRECT_URL'),
  },
})
