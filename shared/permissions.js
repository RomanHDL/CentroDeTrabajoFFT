// Regla de precedencia de permisos -- UNICA funcion que decide si un usuario
// puede acceder a un modulo. Pura (sin DB, sin React): backend y frontend
// deben llamar siempre a esta misma funcion con los datos ya cargados, nunca
// reimplementar la regla por separado en otro lugar.
import { ADMIN_ROLE } from './moduleRegistry.js'

// module: entrada del MODULE_REGISTRY (o null si no existe/esta inactivo)
// role: rol real del usuario (ADMINISTRADOR | SUPERVISOR | LIDER)
// roleAllowed: si el ROL tiene este modulo permitido (RoleModulePermission)
// override: 'ALLOW' | 'DENY' | null/undefined (UserModulePermission de ESTE usuario, si existe)
export function resolveEffectiveAccess({ role, module, roleAllowed, override }) {
  if (!module || module.active === false) return false

  // Administrador siempre tiene acceso total, sin excepcion -- nunca debe
  // quedar el sistema sin un camino administrable (ver moduleRegistry.js).
  if (role === ADMIN_ROLE) return true

  // Modulos reservados (Usuarios, Layout 2D) son EXCLUSIVOS de Administrador
  // -- ningun rol ni override individual puede otorgar acceso aqui.
  if (module.systemReserved) return false

  if (override === 'ALLOW') return true
  if (override === 'DENY') return false

  // INHERIT o sin override -> cae al permiso del rol.
  return !!roleAllowed
}
