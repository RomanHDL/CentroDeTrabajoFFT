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
import GroupIcon from '@mui/icons-material/Group'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { NavLink } from 'react-router-dom'

export const SIDEBAR_WIDTH = 224
export const SIDEBAR_WIDTH_COLLAPSED = 72

// El sidebar es solo UX: dos modulos separados (Dashboard = metricas/resumen,
// Centro de Trabajo = areas/lineas/estaciones/personal/operacion) y, solo para
// ADMINISTRADOR, Usuarios. La proteccion real esta en el backend (requireRole
// en cada API), no en que este menu se muestre u oculte.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon, roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'] },
  { to: '/centro-trabajo', label: 'Centro de Trabajo', icon: FactoryIcon, roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'] },
  { to: '/usuarios', label: 'Usuarios', icon: GroupIcon, roles: ['ADMINISTRADOR'] },
]

/* Sidebar responsive:
   - Desktop/tablet (variant="permanent"): puede colapsarse a solo
     iconos (collapsed=true) — el contenido principal recupera el
     espacio automaticamente porque el sidebar es parte del flex
     row en AppLayout, no un elemento con posicion fija.
   - Movil (variant="temporary"): drawer/overlay de siempre, con
     ancho completo con texto — el concepto de "colapsado" no
     aplica ahi, se abre/cierra por completo.
   Login/logout/roles/ProtectedRoute no se tocan: esto es solo
   presentacion de la misma lista de rutas de siempre. */
export default function Sidebar({ role, open, onClose, variant, collapsed = false, onToggleCollapse }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))
  const isCollapsible = variant === 'permanent'
  const mini = isCollapsible && collapsed
  const width = mini ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH

  const content = (
    <Box sx={{ width, pt: 1, display: 'flex', flexDirection: 'column', height: '100%', transition: 'width .2s ease' }}>
      <List sx={{ flex: 1 }}>
        {items.map(({ to, label, icon: Icon }) => {
          const button = (
            <ListItemButton
              component={NavLink}
              to={to}
              end={to === '/'}
              onClick={variant === 'temporary' ? onClose : undefined}
              sx={{
                mx: 1, mb: 0.5, borderRadius: 2,
                justifyContent: mini ? 'center' : 'flex-start',
                px: mini ? 1 : 2,
                '&.active': { bgcolor: 'action.selected', fontWeight: 700 },
              }}
            >
              <ListItemIcon sx={{ minWidth: mini ? 0 : 36, justifyContent: 'center' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {!mini && <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}>{label}</ListItemText>}
            </ListItemButton>
          )
          return mini ? (
            <Tooltip key={to} title={label} placement="right">
              <Box>{button}</Box>
            </Tooltip>
          ) : (
            <Box key={to}>{button}</Box>
          )
        })}
      </List>

      {isCollapsible && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: mini ? 'center' : 'flex-end', p: 1 }}>
            <Tooltip title={mini ? 'Expandir menú' : 'Colapsar menú'}>
              <IconButton size="small" onClick={onToggleCollapse}>
                {mini ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  )

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width,
        flexShrink: 0,
        transition: 'width .2s ease',
        [`& .MuiDrawer-paper`]: {
          width,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          top: variant === 'permanent' ? 56 : 0,
          height: variant === 'permanent' ? 'calc(100% - 56px)' : '100%',
          overflowX: 'hidden',
          transition: 'width .2s ease',
        },
      }}
    >
      {content}
    </Drawer>
  )
}
