import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import MenuIcon from '@mui/icons-material/Menu'
import { useAuth } from '../state/auth'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'
import { setCurrentUserId } from '../data/personnel/apiSync'
import Sidebar from './Sidebar'
import HeaderUserActions from './HeaderUserActions'

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
  // drawer clasico con hamburguesa, sin depender de hover.
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
  useEffect(() => { setCurrentUserId(user?.id || null) }, [user?.id])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
      {/* 2026-08-27 ("rediseño del header de Centro de Trabajo", a peticion
          explicita del usuario): la barra superior global se OCULTA
          unicamente en /centro-trabajo -- esa pagina construye su propio
          header (logo+titulo+acciones+tabs, ver CentroTrabajoPage.jsx)
          reutilizando exactamente los mismos datos/handlers via
          <Outlet context={...}> mas abajo, en vez de duplicar la barra.
          El resto de rutas (Dashboard, Registro de personal, Usuarios)
          conserva la barra superior tal cual, sin ningun cambio. */}
      {!isWideLayoutRoute && (
        <AppBar position="sticky" elevation={0} sx={{
          bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary',
        }}>
          <Toolbar sx={{ gap: 1.25, minHeight: '56px !important', px: { xs: 1.5, md: 2.5 } }}>
            {!hasFineHover && (
              <IconButton size="small" onClick={() => setMobileOpen(true)}>
                <MenuIcon fontSize="small" />
              </IconButton>
            )}
            <PrecisionManufacturingIcon sx={{ color: '#3B82F6' }} />
            <Typography sx={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.2 }}>
              Centro de Trabajo FFT
            </Typography>
            <Box sx={{ flex: 1 }} />
            <HeaderUserActions mode={mode} setMode={setMode} />
          </Toolbar>
        </AppBar>
      )}

      {hasFineHover && (
        // Hotspot invisible: entrar aqui abre el sidebar. Una vez abierto,
        // el propio sidebar (mas ancho, mismo left:0) lo cubre por completo,
        // asi que el mouse nunca "pierde" cobertura entre los dos elementos.
        // top:0 en /centro-trabajo (sin AppBar arriba), top:56 en el resto.
        <Box
          onMouseEnter={openOnHover}
          sx={{
            position: 'fixed', left: 0, top: isWideLayoutRoute ? 0 : 56, bottom: 0, width: HOTSPOT_WIDTH,
            zIndex: (t) => t.zIndex.drawer + 1,
          }}
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

      <Box sx={{
        px: { xs: 1.5, sm: 2, md: isWideLayoutRoute ? 2 : 3 }, py: { xs: 2, md: 2.5 },
        maxWidth: isWideLayoutRoute ? 1920 : 1600, mx: 'auto', width: '100%',
      }}>
        {/* mode/setMode + apertura del sidebar movil: SOLO los consume
            CentroTrabajoPage.jsx (via useOutletContext) para construir su
            propio header cuando la barra superior global esta oculta arriba
            -- el resto de paginas no llama useOutletContext, no les afecta. */}
        <Outlet context={{ mode, setMode, onOpenMobileSidebar: () => setMobileOpen(true), showMobileMenuButton: !hasFineHover }} />
      </Box>
    </Box>
  )
}
