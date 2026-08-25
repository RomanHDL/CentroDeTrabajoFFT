import { Navigate, useLocation } from 'react-router-dom'
import { useEffectiveModules } from '../state/auth'

/* Bloqueo por RUTA (no solo de menu) segun el acceso EFECTIVO (rol + override
   individual, resuelto en servidor) -- si este usuario ya no tiene este
   modulo permitido (un ADMINISTRADOR lo quito por rol o le puso DENY
   individual desde Usuarios) y entra por URL directa o por un link viejo, se
   manda al primer modulo que SI tenga permitido en vez de mostrar la pagina.
   Es el UNICO guard de acceso por modulo -- deliberadamente independiente del
   dispositivo (2026-08-25: se elimino RequireDesktop, que bloqueaba por touch
   sin mirar permisos y rompia tablet incluso para ADMINISTRADOR). */
export default function RequireModuleAccess({ children }) {
  const location = useLocation()
  const { modules, loading } = useEffectiveModules()

  if (loading) return null
  if (modules.includes(location.pathname)) return children
  if (modules.length > 0) return <Navigate to={modules[0]} replace />
  return <Navigate to="/login" replace />
}
