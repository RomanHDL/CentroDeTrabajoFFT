import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import MenuIcon from '@mui/icons-material/Menu'
import LockResetIcon from '@mui/icons-material/LockReset'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../state/auth'
import { ROLE_LABELS } from './roleLabels'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'
import Sidebar from './Sidebar'

function initialsOf(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?'
}

const CLOSE_DELAY_MS = 320
const HOTSPOT_WIDTH = 14

export default function AppLayout({ mode, setMode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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
  const [menuAnchor, setMenuAnchor] = useState(null)
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

  const roleLabel = useMemo(() => ROLE_LABELS[user?.role] || user?.role, [user])

  async function handleLogout() {
    setMenuAnchor(null)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
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
          <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton size="small" onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}>
              {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Box
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', ml: 0.5, px: 1, py: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Avatar sx={{ width: 30, height: 30, fontSize: 13, fontWeight: 700, bgcolor: '#3B82F6' }}>
              {initialsOf(user?.name)}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{user?.name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{roleLabel}</Typography>
            </Box>
          </Box>

          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{roleLabel} · Mi cuenta</Typography>
            </Box>
            <Divider />
            {/* Cambio de contraseña voluntario: solo ADMINISTRADOR (a peticion
                explicita del usuario). SUPERVISOR/LIDER reciben su contraseña
                nueva de un administrador (Usuarios > Restablecer contraseña);
                el cambio FORZADO por contraseña temporal sigue aplicando a
                cualquier rol via el redirect de ProtectedRoute, sin pasar por
                este menu. */}
            {user?.role === 'ADMINISTRADOR' && (
              <MenuItem onClick={() => { setMenuAnchor(null); navigate('/cambiar-contrasena') }}>
                <ListItemIcon><LockResetIcon fontSize="small" /></ListItemIcon>
                Cambiar contraseña
              </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {hasFineHover && (
        // Hotspot invisible: entrar aqui abre el sidebar. Una vez abierto,
        // el propio sidebar (mas ancho, mismo left:0) lo cubre por completo,
        // asi que el mouse nunca "pierde" cobertura entre los dos elementos.
        <Box
          onMouseEnter={openOnHover}
          sx={{
            position: 'fixed', left: 0, top: 56, bottom: 0, width: HOTSPOT_WIDTH,
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
        px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 2.5 },
        maxWidth: 1600, mx: 'auto', width: '100%',
      }}>
        <Outlet />
      </Box>
    </Box>
  )
}
