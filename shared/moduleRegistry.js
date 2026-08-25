// Registro central de modulos del sistema -- UNICA fuente de verdad de que
// modulos existen, sus metadatos, y si su acceso es protegido/reservado.
// Importable tanto desde src/ (Vite) como desde api//server-lib (Node, ESM
// nativo gracias a "type": "module" en package.json) -- por eso este archivo
// NO importa nada de React/MUI/Prisma, solo datos y funciones puras.
//
// `key` es exactamente el mismo string que ya se usaba como "path" en
// RoleModuleAccess.modules (/dashboard, /centro-trabajo, /registro-personal)
// -- intencional, para que la migracion de datos existentes sea trivial.
//
// NO se agregaron modulos ficticios (el mockup mostraba "Reportes"/
// "Configuracion" solo como ejemplo -- no existen paginas reales para ellos,
// asi que no se inventan aqui).
export const ADMIN_ROLE = 'ADMINISTRADOR'

export const MODULE_REGISTRY = [
  {
    key: '/dashboard',
    name: 'Dashboard',
    description: 'Vista general de KPIs y piso de producción',
    icon: 'Dashboard',
    active: true,
    permissionProtected: true,
    systemReserved: false,
  },
  {
    key: '/centro-trabajo',
    name: 'Centro de Trabajo',
    description: 'Líneas, estaciones, personal y áreas de trabajo',
    icon: 'Factory',
    active: true,
    permissionProtected: true,
    systemReserved: false,
  },
  {
    key: '/registro-personal',
    name: 'Registro de personal',
    description: 'Check-in y asistencia diaria',
    icon: 'PersonAddAlt1',
    active: true,
    permissionProtected: true,
    systemReserved: false,
  },
  {
    key: '/usuarios',
    name: 'Usuarios',
    description: 'Administración de usuarios, roles y permisos',
    icon: 'Group',
    active: true,
    permissionProtected: true,
    systemReserved: true,
  },
  {
    key: '/layout-2d',
    name: 'Layout 2D',
    description: 'Editor visual del layout de planta',
    icon: 'Map',
    active: true,
    permissionProtected: true,
    systemReserved: true,
  },
]

export function listAllModules() {
  return MODULE_REGISTRY.filter((m) => m.active)
}

// Modulos configurables desde "Gestion de permisos" (excluye los reservados
// como Usuarios/Layout 2D, que nunca se administran por rol/usuario ahi).
export function listPermissionProtectedModules() {
  return listAllModules().filter((m) => m.permissionProtected && !m.systemReserved)
}

export function getModule(key) {
  return MODULE_REGISTRY.find((m) => m.key === key && m.active) || null
}
