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
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import { NavLink } from 'react-router-dom'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'

export const SIDEBAR_WIDTH = 232

// El sidebar es solo UX: dos modulos separados (Dashboard = metricas/resumen,
// Centro de Trabajo = areas/lineas/estaciones/personal/operacion) y, solo para
// ADMINISTRADOR, Usuarios. La proteccion real esta en el backend (requireRole
// en cada API), no en que este menu se muestre u oculte.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'] },
  { to: '/centro-trabajo', label: 'Centro de Trabajo', icon: FactoryIcon, roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'] },
  { to: '/registro-personal', label: 'Registro de personal', icon: PersonAddAlt1Icon, roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'] },
  { to: '/usuarios', label: 'Usuarios', icon: GroupIcon, roles: ['ADMINISTRADOR'] },
]

/* En touch (tablet/celular de piso, 2026-08-20 a peticion del
   usuario) el menu se reduce a estas dos, EN ESTE ORDEN — Registro
   de personal primero (es la pantalla de entrada del dia), Centro de
   Trabajo despues. Dashboard/Usuarios siguen existiendo tal cual
   para quien entra desde una computadora (ver RequireDesktop, que
   bloquea esas rutas por URL directa en touch, no solo aqui en el
   menu). */
const TOUCH_NAV_ORDER = ['/registro-personal', '/centro-trabajo']

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
  const isTouch = useIsTouchDevice()
  const byRole = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const items = isTouch
    ? TOUCH_NAV_ORDER.map((to) => byRole.find((item) => item.to === to)).filter(Boolean)
    : byRole

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
