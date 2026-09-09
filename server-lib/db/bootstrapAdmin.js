import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, user } from './client.js'

// Semilla del primer ADMINISTRADOR cuando la tabla User esta vacia (mismo
// patron BOOTSTRAP_ADMIN_* que ya usa cubicaje, ver su CLAUDE.md). Necesario
// porque esta DB (Coolify interno) no es alcanzable desde afuera -- ni
// pg_dump ni create-initial-admin.mjs pueden correr contra ella desde una
// maquina local (puerto externo 55433 bloqueado por UFW). Corre DENTRO del
// contenedor, con las mismas variables de entorno que ya tiene el server.
//
// Idempotente y de una sola vez: solo crea el usuario si BOOTSTRAP_ADMIN_USERNAME
// no existe todavia. Una vez creado, las env vars se pueden borrar de Coolify
// sin romper nada (igual que documenta cubicaje).
export async function runBootstrapAdmin() {
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  const name = process.env.BOOTSTRAP_ADMIN_NAME || username
  if (!username || !password) return // sin las 2 requeridas, no-op silencioso

  try {
    const [existing] = await db.select().from(user).where(eq(user.username, username)).limit(1)
    if (existing) {
      console.log(`[bootstrap-admin] "${username}" ya existe, no se toca`)
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await db.insert(user).values({
      username,
      name,
      role: 'ADMINISTRADOR',
      passwordHash,
      active: true,
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    console.log(`[bootstrap-admin] administrador "${username}" creado`)
  } catch (e) {
    console.error('[bootstrap-admin] error (servidor sigue levantando):', e.message)
  }
}
