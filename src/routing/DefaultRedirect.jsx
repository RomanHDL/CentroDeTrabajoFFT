import { Navigate } from 'react-router-dom'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'
import { useModulesForCurrentRole } from '../state/auth'

/* Destino de "/" — en desktop preferimos Dashboard (resumen); en touch
   (tablet/celular de piso) preferimos Registro de personal, que es el modulo
   de entrada del dia en ese tipo de dispositivo (2026-08-20). Pero si el rol
   de este usuario no tiene ESE modulo permitido (RoleModuleAccess, un
   ADMINISTRADOR pudo haberlo quitado desde Usuarios), cae al primer modulo
   que si tenga permitido -- nunca manda a una pagina que despues lo va a
   rebotar. */
export default function DefaultRedirect() {
  const isTouch = useIsTouchDevice()
  const { modules, loading } = useModulesForCurrentRole()

  if (loading) return null

  const preferred = isTouch ? '/registro-personal' : '/dashboard'
  if (modules.includes(preferred)) return <Navigate to={preferred} replace />
  if (modules.length > 0) return <Navigate to={modules[0]} replace />
  return <Navigate to="/login" replace />
}
