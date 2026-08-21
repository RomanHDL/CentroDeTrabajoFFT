import { Navigate, useLocation } from 'react-router-dom'
import { useModulesForCurrentRole } from '../state/auth'

/* Bloqueo por RUTA (no solo de menu) segun RoleModuleAccess -- si el rol del
   usuario ya no tiene este modulo permitido (un ADMINISTRADOR lo quito desde
   Usuarios) y entra por URL directa o por un link viejo, se manda al primer
   modulo que SI tenga permitido en vez de mostrar la pagina. Se combina con
   RequireDesktop (touch) sin pisarlo -- ambos guards son independientes y
   ambos deben pasar. */
export default function RequireModuleAccess({ children }) {
  const location = useLocation()
  const { modules, loading } = useModulesForCurrentRole()

  if (loading) return null
  if (modules.includes(location.pathname)) return children
  if (modules.length > 0) return <Navigate to={modules[0]} replace />
  return <Navigate to="/login" replace />
}
