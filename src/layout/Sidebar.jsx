import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FactoryIcon from '@mui/icons-material/Factory'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import GroupIcon from '@mui/icons-material/Group'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffectiveModules } from '../state/auth'

// 250-270px (rediseño visual 2026-08-28, "sidebar blanca/azul tipo
// referencia") -- antes 232, sube dentro del rango pedido. Es un overlay de
// posicion fija (nunca reserva espacio en el layout), asi que este cambio
// no mueve ni redimensiona el contenido principal.
export const SIDEBAR_WIDTH = 260

// Mismo azul de marca que ya usa toda la app (AppBar/LoginPage/
// CentroTrabajoPage, ver PrecisionManufacturingIcon sx={{ color: '#3B82F6' }}
// en esos archivos) -- una sola constante aqui para no repetir el literal.
const BRAND_BLUE = '#3B82F6'

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
// `labelKey` (fase 4, i18n, no `label` literal) -- referencia a
// public/locales/{lng}/navigation.json, resuelta con useTranslation en
// NavList mas abajo. es-MX (idioma por defecto, ver src/i18n.js) tiene
// EXACTAMENTE el mismo texto que antes -- cero cambio visible para el
// personal actual, solo cambia de donde sale el string.
const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'dashboard', icon: DashboardIcon, configurable: true },
  { to: '/centro-trabajo', labelKey: 'centroDeTrabajo', icon: FactoryIcon, configurable: true },
  { to: '/usuarios', labelKey: 'usuarios', icon: GroupIcon, configurable: true },
  {
    to: '/registro-personal',
    labelKey: 'registroDePersonal',
    icon: PersonAddAlt1Icon,
    configurable: true,
  },
  // 2026-08-28 ("ajustes controlados"): 3 modulos nuevos, mismo patron que
  // los 4 de arriba -- solo navegacion, el permiso real lo resuelve
  // useEffectiveModules() (shared/moduleRegistry.js), nunca una lista de
  // permisos aparte aqui.
  { to: '/kpis', labelKey: 'kpis', icon: QueryStatsIcon, configurable: true },
  { to: '/asistencia', labelKey: 'asistencia', icon: EventAvailableIcon, configurable: true },
  { to: '/auditoria', labelKey: 'auditoria', icon: FactCheckIcon, configurable: true },
]

// Estilo de item de menu (rediseño visual 2026-08-28, referencia "sidebar
// blanca/azul"): sin card/borde individual por item (aire visual, lista
// limpia), activo = fondo azul extremadamente claro + texto/icono azul +
// barra vertical azul de 3px pegada al borde izquierdo (via '&::before',
// nunca un elemento aparte) en vez del bgcolor gris grande de antes; hover
// = mismo azul clarito mas un desplazamiento sutil (2px). Nunca toca
// rutas/permisos/orden -- ESTO es exactamente lo mismo NAV_ITEMS/filter de
// siempre, solo cambia sx.
function NavList({ items, onItemClick }) {
  const { t } = useTranslation('navigation')
  return (
    <List sx={{ flex: 1, pt: 1, px: 1.25 }}>
      {items.map(({ to, labelKey, icon: Icon }) => (
        <ListItemButton
          key={to}
          component={NavLink}
          to={to}
          end={to === '/'}
          onClick={onItemClick}
          sx={{
            position: 'relative',
            mb: 0.5,
            px: 1.75,
            py: 1.5,
            minHeight: 56,
            borderRadius: '11px',
            color: 'text.primary',
            transition: 'background-color 180ms ease, color 180ms ease, transform 180ms ease',
            '&:hover': {
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59,130,246,.14)' : '#EFF6FF'),
              transform: 'translateX(2px)',
            },
            '&.active': {
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59,130,246,.18)' : '#EFF6FF'),
              color: BRAND_BLUE,
            },
            '&.active::before': {
              content: '""',
              position: 'absolute',
              left: 4,
              top: '22%',
              bottom: '22%',
              width: 3,
              bgcolor: BRAND_BLUE,
              borderRadius: 4,
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
            <Icon sx={{ fontSize: 21 }} />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ fontSize: 14.5, fontWeight: 600, color: 'inherit' }}
          >
            {t(labelKey)}
          </ListItemText>
        </ListItemButton>
      ))}
    </List>
  )
}

// Encabezado (rediseño visual 2026-08-28): mismo icono de marca que ya usa
// toda la app (PrecisionManufacturingIcon, #3B82F6 -- ver AppLayout.jsx/
// LoginPage.jsx/CentroTrabajoPage.jsx), envuelto en una insignia azul
// redondeada compacta -- nunca un logotipo nuevo. `onToggle` es exactamente
// el mismo handler que antes (onTogglePin): el boton solo cambia de icono
// (pin -> chevron) y de estilo, el comportamiento de fijar/soltar el menu
// abierto NO cambia.
function SidebarHeader({ onToggle, toggleTitle, pinned }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.75,
        py: 1.75,
        minHeight: 64,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '10px',
          flexShrink: 0,
          bgcolor: BRAND_BLUE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PrecisionManufacturingIcon sx={{ color: '#fff', fontSize: 20 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.15 }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 800,
            letterSpacing: 0.2,
            color: 'text.primary',
            lineHeight: 1.25,
          }}
        >
          CENTRO DE
        </Typography>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1.25 }}>
          <Box component="span" sx={{ color: 'text.primary' }}>
            TRABAJO{' '}
          </Box>
          <Box component="span" sx={{ color: BRAND_BLUE }}>
            FFT
          </Box>
        </Typography>
      </Box>
      {onToggle && (
        <Tooltip title={toggleTitle}>
          <IconButton
            size="small"
            onClick={onToggle}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(59,130,246,.35)' : 'rgba(59,130,246,.18)',
              transition: 'background-color 180ms ease',
              '&:hover': {
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59,130,246,.16)' : '#EFF6FF'),
              },
            }}
          >
            <KeyboardDoubleArrowLeftIcon
              fontSize="small"
              sx={{
                color: BRAND_BLUE,
                transition: 'transform 220ms ease',
                transform: pinned ? 'none' : 'rotate(180deg)',
              }}
            />
          </IconButton>
        </Tooltip>
      )}
    </Box>
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
export default function Sidebar({
  role,
  open,
  onClose,
  variant,
  pinned,
  onTogglePin,
  onMouseEnter,
  onMouseLeave,
}) {
  const { modules: allowedModules, loading: permsLoading } = useEffectiveModules()
  // Misma lista de modulos permitidos para CUALQUIER dispositivo (desktop,
  // tablet, movil) -- solo cambia el contenedor visual (overlay vs Drawer,
  // ver variant mas abajo), nunca el contenido. Bug critico corregido
  // 2026-08-25: antes existia un TOUCH_NAV_ORDER hardcodeado que en touch
  // descartaba el calculo real de permisos y dejaba ver solo 2 rutas fijas
  // sin importar el rol -- eso rompia tablet incluso para ADMINISTRADOR.
  const items = NAV_ITEMS.filter((item) =>
    item.configurable
      ? // Mientras carga (allowedModules === null) no se oculta nada: evita el
        // parpadeo de "sin modulos" un instante antes de que llegue la respuesta.
        permsLoading || allowedModules === null || allowedModules.includes(item.to)
      : item.roles.includes(role),
  )

  if (variant === 'overlay') {
    return (
      <Box
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          position: 'fixed',
          left: 0,
          top: 56,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          transform: open || pinned ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open || pinned ? '4px 0 20px rgba(15,23,42,0.08)' : 'none',
          transition: 'transform 220ms cubic-bezier(0.4,0,0.2,1), box-shadow 220ms ease',
          zIndex: (t) => t.zIndex.drawer + 2,
        }}
      >
        <SidebarHeader
          onToggle={onTogglePin}
          toggleTitle={pinned ? 'Dejar de fijar' : 'Fijar menú abierto'}
          pinned={pinned}
        />
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
        <SidebarHeader />
        <NavList items={items} onItemClick={onClose} />
      </Box>
    </Drawer>
  )
}
