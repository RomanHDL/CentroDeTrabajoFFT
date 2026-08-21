import Alert from '@mui/material/Alert'
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useIsTouchDevice } from './useIsTouchDevice'

/* screen.orientation.lock() (ver AppLayout.jsx) NO es confiable fuera
   de pantalla completa/PWA instalada — en un navegador normal (Chrome
   Android sin instalar, o Safari/iOS que ni siquiera implementa la
   API) el intento de forzar horizontal simplemente no aplica y el
   contenido ancho (WorkAreaMap) se queda en portrait, obligando a
   hacer scroll lateral con el dedo. Este aviso es el mecanismo REAL
   para ese caso: no bloquea nada (el usuario sigue pudiendo usar la
   pagina con scroll si de verdad no puede girar el dispositivo), solo
   le avisa claramente que girarlo se ve mejor. */
export default function RotateDeviceHint({ sx }) {
  const isTouch = useIsTouchDevice()
  const isPortrait = useMediaQuery('(orientation: portrait)')

  if (!isTouch || !isPortrait) return null

  return (
    <Alert
      icon={<ScreenRotationIcon fontSize="small" />}
      severity="info"
      sx={{ mb: 2, fontSize: 13, fontWeight: 600, ...sx }}
    >
      Gira tu dispositivo para ver mejor esta sección.
    </Alert>
  )
}
