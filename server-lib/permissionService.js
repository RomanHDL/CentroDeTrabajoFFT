// Unico punto que toca la DB para resolver permisos de modulo -- todo
// endpoint que necesite leer/escribir permisos pasa por aqui, nunca hace
// prisma.roleModulePermission.* / prisma.userModulePermission.* directo en
// otro archivo (para no duplicar la regla de precedencia ni las validaciones
// de "Administrador siempre tiene todo" / "reservado nunca se gestiona").
import { prisma } from './prisma.js'
import { resolveEffectiveAccess } from '../shared/permissions.js'
import {
  ADMIN_ROLE,
  getModule,
  listPermissionProtectedModules,
  listAllModules,
} from '../shared/moduleRegistry.js'

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export async function getRoleModulePermissionsMap() {
  const rows = await prisma.roleModulePermission.findMany()
  const map = {}
  for (const role of ROLES) map[role] = {}
  for (const m of listPermissionProtectedModules()) {
    for (const role of ROLES) map[role][m.key] = false
  }
  for (const row of rows) {
    if (!map[row.role]) map[row.role] = {}
    map[row.role][row.moduleKey] = row.allowed
  }
  // Administrador siempre efectivamente true para los protegidos, aunque no
  // haya fila -- refleja la regla real (resolveEffectiveAccess) en este mapa.
  for (const m of listPermissionProtectedModules()) {
    map[ADMIN_ROLE][m.key] = true
  }
  return map
}

export async function setRoleModulePermission(role, moduleKey, allowed, actingUserId) {
  if (!ROLES.includes(role)) throw new Error('Rol invalido')
  const module = getModule(moduleKey)
  if (!module || !module.permissionProtected) throw new Error('Modulo invalido')
  if (module.systemReserved) throw new Error('Este modulo es reservado y no se gestiona por rol')
  if (role === ADMIN_ROLE && allowed === false) {
    throw new Error('ADMINISTRADOR siempre debe tener acceso completo')
  }

  return prisma.roleModulePermission.upsert({
    where: { role_moduleKey: { role, moduleKey } },
    create: { role, moduleKey, allowed, updatedByUserId: actingUserId ?? null },
    update: { allowed, updatedByUserId: actingUserId ?? null },
  })
}

export async function getUserOverrides(userId) {
  const rows = await prisma.userModulePermission.findMany({ where: { userId } })
  const map = {}
  for (const row of rows) map[row.moduleKey] = row.effect
  return map
}

export async function setUserOverride(userId, moduleKey, effect, actingUserId) {
  const module = getModule(moduleKey)
  if (!module || !module.permissionProtected) throw new Error('Modulo invalido')
  if (module.systemReserved)
    throw new Error('Este modulo es reservado y no admite overrides individuales')
  if (!['ALLOW', 'DENY', 'INHERIT'].includes(effect)) throw new Error('Efecto invalido')

  if (effect === 'INHERIT') {
    await prisma.userModulePermission.deleteMany({ where: { userId, moduleKey } })
    return null
  }

  return prisma.userModulePermission.upsert({
    where: { userId_moduleKey: { userId, moduleKey } },
    create: { userId, moduleKey, effect, updatedByUserId: actingUserId ?? null },
    update: { effect, updatedByUserId: actingUserId ?? null },
  })
}

export async function canUserAccessModule({ userId, role, moduleKey }) {
  const module = getModule(moduleKey)
  if (!module) return false
  if (role === ADMIN_ROLE) return true

  const [roleRow, overrideRow] = await Promise.all([
    prisma.roleModulePermission.findUnique({ where: { role_moduleKey: { role, moduleKey } } }),
    prisma.userModulePermission.findUnique({ where: { userId_moduleKey: { userId, moduleKey } } }),
  ])

  return resolveEffectiveAccess({
    role,
    module,
    roleAllowed: roleRow?.allowed ?? false,
    override: overrideRow?.effect ?? null,
  })
}

export async function getEffectiveModulesForUser({ userId, role }) {
  const modules = listAllModules().filter((m) => m.permissionProtected)
  if (role === ADMIN_ROLE) return modules.map((m) => m.key)

  const [roleRows, overrideRows] = await Promise.all([
    prisma.roleModulePermission.findMany({ where: { role } }),
    prisma.userModulePermission.findMany({ where: { userId } }),
  ])
  const roleMap = {}
  roleRows.forEach((r) => {
    roleMap[r.moduleKey] = r.allowed
  })
  const overrideMap = {}
  overrideRows.forEach((r) => {
    overrideMap[r.moduleKey] = r.effect
  })

  return modules
    .filter((m) =>
      resolveEffectiveAccess({
        role,
        module: m,
        roleAllowed: roleMap[m.key] ?? false,
        override: overrideMap[m.key] ?? null,
      }),
    )
    .map((m) => m.key)
}

// Acceso efectivo de TODOS los usuarios activos a un modulo dado -- usado por
// el boton "Ver N usuarios" de la matriz Por Rol (acceso EFECTIVO, no solo
// por rol: incluye a quien tenga un override ALLOW individual).
export async function getUsersWithEffectiveAccess(moduleKey) {
  const module = getModule(moduleKey)
  if (!module || !module.permissionProtected) return []

  const users = await prisma.user.findMany({ where: { active: true } })
  const [roleRows, overrideRows] = await Promise.all([
    prisma.roleModulePermission.findMany({ where: { moduleKey } }),
    prisma.userModulePermission.findMany({ where: { moduleKey } }),
  ])
  const roleMap = {}
  roleRows.forEach((r) => {
    roleMap[r.role] = r.allowed
  })
  const overrideByUser = {}
  overrideRows.forEach((r) => {
    overrideByUser[r.userId] = r.effect
  })

  return users.filter((u) =>
    resolveEffectiveAccess({
      role: u.role,
      module,
      roleAllowed: roleMap[u.role] ?? false,
      override: overrideByUser[u.id] ?? null,
    }),
  )
}
