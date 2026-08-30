import { RotateCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { alertToneClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { useIsTouchDevice } from './useIsTouchDevice'

const PORTRAIT_QUERY = '(orientation: portrait)'

// Reemplaza useMediaQuery('(orientation: portrait)') de MUI (que sigue vivo,
// sin tocar, dentro de useIsTouchDevice.js -- no es uno de los 7 archivos de
// este lote) con matchMedia nativo, mismo comportamiento reactivo.
function useIsPortrait() {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(PORTRAIT_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(PORTRAIT_QUERY)
    const handleChange = () => setMatches(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return matches
}

/* screen.orientation.lock() (ver AppLayout.jsx) NO es confiable fuera
   de pantalla completa/PWA instalada — en un navegador normal (Chrome
   Android sin instalar, o Safari/iOS que ni siquiera implementa la
   API) el intento de forzar horizontal simplemente no aplica y el
   contenido ancho (WorkAreaMap) se queda en portrait, obligando a
   hacer scroll lateral con el dedo. Este aviso es el mecanismo REAL
   para ese caso: no bloquea nada (el usuario sigue pudiendo usar la
   pagina con scroll si de verdad no puede girar el dispositivo), solo
   le avisa claramente que girarlo se ve mejor. */
export default function RotateDeviceHint({ className }) {
  const isTouch = useIsTouchDevice()
  const isPortrait = useIsPortrait()

  if (!isTouch || !isPortrait) return null

  return (
    <div
      className={cn(
        alertToneClass('info'),
        'mb-4 flex items-center gap-2 text-[13px] font-semibold',
        className,
      )}
    >
      <RotateCw className="h-5 w-5 shrink-0" />
      Gira tu dispositivo para ver mejor esta sección.
    </div>
  )
}
