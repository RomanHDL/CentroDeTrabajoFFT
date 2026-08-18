import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Box from '@mui/material/Box'
import DashboardIcon from '@mui/icons-material/Dashboard'
import GroupIcon from '@mui/icons-material/Group'
import { NavLink } from 'react-router-dom'

export const SIDEBAR_WIDTH = 224

// El sidebar es solo UX: agrupa el modulo de "Centro de Produccion" (Dashboard, Produccion,
// Personal, Pase de lista, Asignaciones, Movimientos y Reportes viven ahi mismo como tabs) y,
// solo para ADMINISTRADOR, el modulo de Usuarios. La proteccion real esta en el backend
// (requireRole en cada API), no en que este menu se muestre u oculte.
const NAV_ITEMS = [
  { to: '/', label: 'Centro de Producción', icon: DashboardIcon, roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'] },
  { to: '/usuarios', label: 'Usuarios', icon: GroupIcon, roles: ['ADMINISTRADOR'] },
]

export default function Sidebar({ role, open, onClose, variant }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  const content = (
    <Box sx={{ width: SIDEBAR_WIDTH, pt: 1 }}>
      <List>
        {items.map(({ to, label, icon: Icon }) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            end={to === '/'}
            onClick={variant === 'temporary' ? onClose : undefined}
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
    </Box>
  )

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
          top: variant === 'permanent' ? 56 : 0,
          height: variant === 'permanent' ? 'calc(100% - 56px)' : '100%',
        },
      }}
    >
      {content}
    </Drawer>
  )
}
