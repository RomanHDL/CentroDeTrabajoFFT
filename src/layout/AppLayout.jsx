import { Cog, Menu as MenuIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { setCurrentUserId } from '../data/personnel/apiSync'
import { useAuth } from '../state/auth'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'
import HeaderUserActions from './HeaderUserActions'
import Sidebar from './Sidebar'

const CLOSE_DELAY_MS = 320
const HOTSPOT_WIDTH = 14

export default function AppLayout({ mode, setMode }) {
  const { user } = useAuth()
  const location = useLocation()
  // El plano 2D (OperatingFloorPlan) es el unico contenido que de verdad
  // necesita aprovechar casi todo el ancho de la pantalla (2026-08-25, a
  // peticion explicita del usuario) -- el resto de paginas (tablas,
  // formularios) se queda exactamente en el maxWidth de siempre, no se
  // toca nada fuera de estas rutas. Dashboard ya NO lo necesita (se le
  // quito el layout, ver DashboardPage.jsx), Centro de Trabajo si (Áreas
  // de trabajo ahora lo usa, ver AreasLayoutView.jsx).
  const isWideLayoutRoute = location.pathname === '/centro-trabajo'
  // Puntero real del dispositivo, no ancho de pantalla: un mouse/trackpad
  // real habilita el auto-hide por hover; touch (tablet/movil) usa el
  // Sheet clasico con hamburguesa, sin depender de hover.
  const isTouch = useIsTouchDevice()
  const hasFineHover = !isTouch

  // Una vez adentro de la app (login ya quedo en vertical, ver
  // LoginPage), en touch se intenta fijar horizontal — es la
  // orientacion pensada para tablet en piso. "Best effort": la
  // Screen Orientation API solo permite lock() en pantalla completa o
  // dentro de una PWA instalada (Chrome/Android); Safari/iOS no la
  // implementa en absoluto. Si falla o no existe, no rompe nada, el
  // layout responsive sigue funcionando igual en cualquier orientacion.
  useEffect(() => {
    if (!isTouch) return
    const orientation = window.screen?.orientation
    if (!orientation?.lock) return
    orientation.lock('landscape').catch(() => {})
  }, [isTouch])

  const [mobileOpen, setMobileOpen] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const closeTimer = useRef(null)

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  function openOnHover() {
    clearCloseTimer()
    setHoverOpen(true)
  }
  function scheduleClose() {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setHoverOpen(false), CLOSE_DELAY_MS)
  }

  // apiSync.js necesita saber a quien avisarle cuando SU solicitud se resuelve (ver Cambio 4,
  // pollOnce) -- se fija aqui porque este es el componente que ya consume la sesion real.
  useEffect(() => {
    setCurrentUserId(user?.id || null)
  }, [user?.id])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* 2026-08-27 ("rediseño del header de Centro de Trabajo", a peticion
          explicita del usuario): la barra superior global se OCULTA
          unicamente en /centro-trabajo -- esa pagina construye su propio
          header (logo+titulo+acciones+tabs, ver CentroTrabajoPage.jsx)
          reutilizando exactamente los mismos datos/handlers via
          <Outlet context={...}> mas abajo, en vez de duplicar la barra.
          El resto de rutas (Dashboard, Registro de personal, Usuarios)
          conserva la barra superior tal cual, sin ningun cambio. */}
      {!isWideLayoutRoute && (
        <header className="sticky top-0 z-[1100] border-b border-border bg-card text-foreground">
          <div className="flex min-h-14 items-center gap-2.5 px-3 md:px-5">
            {!hasFineHover && (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-full p-1.5 hover:bg-accent"
              >
                <MenuIcon size={20} />
              </button>
            )}
            <Cog size={24} style={{ color: '#3B82F6' }} />
            <p className="text-[15px] font-extrabold tracking-[-0.2px]">Centro de Trabajo FFT</p>
            <div className="flex-1" />
            <HeaderUserActions mode={mode} setMode={setMode} />
          </div>
        </header>
      )}

      {hasFineHover && (
        // Hotspot invisible: entrar aqui abre el sidebar. Una vez abierto,
        // el propio sidebar (mas ancho, mismo left:0) lo cubre por completo,
        // asi que el mouse nunca "pierde" cobertura entre los dos elementos.
        // top:0 en /centro-trabajo (sin header arriba), top:56 en el resto.
        // biome-ignore lint/a11y/noStaticElementInteractions: zona de deteccion de mouse, el hamburguesa+Sheet cubre teclado/touch sin depender de este div
        <div
          onMouseEnter={openOnHover}
          className="fixed bottom-0 left-0 z-[1201]"
          style={{ top: isWideLayoutRoute ? 0 : 56, width: HOTSPOT_WIDTH }}
        />
      )}

      <Sidebar
        role={user?.role}
        open={hasFineHover ? hoverOpen : mobileOpen}
        onClose={() => setMobileOpen(false)}
        variant={hasFineHover ? 'overlay' : 'temporary'}
        pinned={pinned}
        onTogglePin={() => setPinned((p) => !p)}
        onMouseEnter={hasFineHover ? openOnHover : undefined}
        onMouseLeave={hasFineHover ? scheduleClose : undefined}
      />

      <div
        className={cn(
          'mx-auto w-full px-3 py-4 sm:px-4 md:py-5',
          isWideLayoutRoute ? 'max-w-[1920px] md:px-4' : 'max-w-[1600px] md:px-6',
        )}
      >
        {/* mode/setMode + apertura del sidebar movil: SOLO los consume
            CentroTrabajoPage.jsx (via useOutletContext) para construir su
            propio header cuando la barra superior global esta oculta arriba
            -- el resto de paginas no llama useOutletContext, no les afecta. */}
        <Outlet
          context={{
            mode,
            setMode,
            onOpenMobileSidebar: () => setMobileOpen(true),
            showMobileMenuButton: !hasFineHover,
          }}
        />
      </div>
    </div>
  )
}
