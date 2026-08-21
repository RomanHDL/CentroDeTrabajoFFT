// Seed inicial de RoleModuleAccess -- corre UNA vez para que el sistema
// funcione de inmediato sin depender de que un admin lo configure a mano
// primero. LIDER queda SOLO con registro-personal a peticion explicita del
// usuario (2026-08-21). ADMINISTRADOR y SUPERVISOR mantienen el mismo acceso
// que ya tenian antes de este cambio (dashboard + centro-trabajo +
// registro-personal); "/usuarios" no vive aqui (ver nota en schema.prisma).
import { prisma } from '../server-lib/prisma.js'

const DEFAULTS = {
  ADMINISTRADOR: ['/dashboard', '/centro-trabajo', '/registro-personal'],
  SUPERVISOR: ['/dashboard', '/centro-trabajo', '/registro-personal'],
  LIDER: ['/registro-personal'],
}

for (const [role, modules] of Object.entries(DEFAULTS)) {
  await prisma.roleModuleAccess.upsert({
    where: { role },
    create: { role, modules },
    update: { modules },
  })
  console.log(`OK ${role} -> ${modules.join(', ')}`)
}

await prisma.$disconnect()
