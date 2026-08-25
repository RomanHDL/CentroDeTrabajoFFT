import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FactoryIcon from '@mui/icons-material/Factory'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import GroupIcon from '@mui/icons-material/Group'
import MapIcon from '@mui/icons-material/Map'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import { NavLink } from 'react-router-dom'
import { useEffectiveModules } from '../state/auth'

export const SIDEBAR_WIDTH = 232

// El sidebar es solo UX -- la proteccion real esta en el backend
// (requireModuleAccess en cada API), no en que este menu se muestre u oculte.
//
// "configurable" = true para los 5 modulos cuyo acceso (por rol + override
// individual) un ADMINISTRADOR puede editar en vivo desde Usuarios ->
// Gestion de permisos (ver src/state/auth.jsx useEffectiveModules). Desde
// 2026-08-25 Usuarios y Layout 2D tambien son configurables -- decision
// explicita del usuario (un rol con el modulo "Usuarios" tiene control total
// de gestion de usuarios/permisos, incluido reset de contraseñas). Un
// ADMINISTRADOR siempre tiene acceso total sin excepcion (resolveEffectiveAccess).
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, configurable: true },
  { to: '/centro-trabajo', label: 'Centro de Trabajo', icon: FactoryIcon, configurable: true },
  { to: '/layout-2d', label: 'Layout 2D', icon: MapIcon, configurable: true },
  { to: '/usuarios', label: 'Usuarios', icon: GroupIcon, configurable: true },
  { to: '/registro-personal', label: 'Registro de personal', icon: PersonAddAlt1Icon, configurable: true },
]

function NavList({ items, onItemClick }) {
  return (
    <List sx={{ flex: 1, pt: 1 }}>
      {items.map(({ to, label, icon: Icon }) => (
        <ListItemButton
          key={to}
          component={NavLink}
          to={to}
          end={to === '/'}
          onClick={onItemClick}
          sx={{
            mx: 1, mb: 0.5, borderRadius: 2,
            '&.active': { bgcolor: 'action.selected', fontWeight: 700 },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}><Icon fontSize="small" /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>{label}</ListItemText>
        </ListItemButton>
      ))}
    </List>
  )
}

/* Sidebar con dos modos completamente distintos, elegidos por
   AppLayout segun capacidad de puntero real del dispositivo
   (no por ancho de pantalla):

   - variant="overlay" (desktop/laptop con mouse real, hover:hover):
     panel flotante de posicion fija que aparece/desaparece por
     hover — nunca reserva espacio en el layout, por eso el
     contenido principal siempre usa el 100% del ancho disponible.
     AppLayout controla open/close (hotspot + temporizador); aqui
     solo se reenvian los mouse handlers para que entrar al propio
     sidebar cancele el cierre programado.

   - variant="temporary" (touch / sin hover fino — tablet y movil):
     el Drawer de siempre, con boton de hamburguesa, overlay con
     backdrop y cierre al seleccionar o hacer click afuera.

   Login/logout/roles/ProtectedRoute no se tocan: es solo
   presentacion de la misma lista de rutas de siempre. */
export default function Sidebar({ role, open, onClose, variant, pinned, onTogglePin, onMouseEnter, onMouseLeave }) {
  const { modules: allowedModules, loading: permsLoading } = useEffectiveModules()
  // Misma lista de modulos permitidos para CUALQUIER dispositivo (desktop,
  // tablet, movil) -- solo cambia el contenedor visual (overlay vs Drawer,
  // ver variant mas abajo), nunca el contenido. Bug critico corregido
  // 2026-08-25: antes existia un TOUCH_NAV_ORDER hardcodeado que en touch
  // descartaba el calculo real de permisos y dejaba ver solo 2 rutas fijas
  // sin importar el rol -- eso rompia tablet incluso para ADMINISTRADOR.
  const items = NAV_ITEMS.filter((item) => (
    item.configurable
      // Mientras carga (allowedModules === null) no se oculta nada: evita el
      // parpadeo de "sin modulos" un instante antes de que llegue la respuesta.
      ? (permsLoading || allowedModules === null || allowedModules.includes(item.to))
      : item.roles.includes(role)
  ))

  if (variant === 'overlay') {
    return (
      <Box
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          position: 'fixed', left: 0, top: 56, bottom: 0, width: SIDEBAR_WIDTH,
          bgcolor: 'background.paper', borderRight: '1px solid', borderColor: 'divider',
          display: 'flex', flexDirection: 'column',
          transform: open || pinned ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open || pinned ? '6px 0 24px rgba(0,0,0,.14)' : 'none',
          transition: 'transform .2s ease, box-shadow .2s ease',
          zIndex: (t) => t.zIndex.drawer + 2,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, pt: 1 }}>
          <Tooltip title={pinned ? 'Dejar de fijar' : 'Fijar menú abierto'}>
            <IconButton size="small" onClick={onTogglePin}>
              {pinned ? <PushPinIcon fontSize="small" color="primary" /> : <PushPinOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
        <NavList items={items} />
      </Box>
    )
  }

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      sx={{
        [`& .MuiDrawer-paper`]: {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Divider />
        <NavList items={items} onItemClick={onClose} />
      </Box>
    </Drawer>
  )
}
