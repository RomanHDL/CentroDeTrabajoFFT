import { Navigate } from 'react-router-dom'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'

/* Destino de "/" — en desktop sigue siendo Dashboard (resumen); en
   touch (tablet/celular de piso) va directo a Registro de personal,
   que es el modulo de entrada del dia en ese tipo de dispositivo
   (2026-08-20, a peticion del usuario). */
export default function DefaultRedirect() {
  const isTouch = useIsTouchDevice()
  return <Navigate to={isTouch ? '/registro-personal' : '/dashboard'} replace />
}
