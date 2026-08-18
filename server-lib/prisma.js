import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton para no agotar conexiones en dev (hot-reload) ni en funciones serverless
// reutilizadas entre invocaciones dentro del mismo proceso.
const globalForPrisma = globalThis

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma = globalForPrisma.__fftPrisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__fftPrisma = prisma
}
