import { Navigate } from 'react-router-dom'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'

/* Bloqueo por RUTA (no solo de menu) de Dashboard/Usuarios en touch —
   si alguien entra por URL directa desde una tablet/celular, se manda
   a Registro de personal en vez de mostrar la pagina (2026-08-20, a
   peticion del usuario). En desktop no cambia nada; se combina con
   ProtectedRoute (sesion/rol) sin pisarlo. */
export default function RequireDesktop({ children }) {
  const isTouch = useIsTouchDevice()
  if (isTouch) return <Navigate to="/registro-personal" replace />
  return children
}
