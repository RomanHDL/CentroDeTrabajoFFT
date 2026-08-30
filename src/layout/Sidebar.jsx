import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ChevronsLeft,
  ClipboardCheck,
  Code2,
  Factory,
  History,
  LayoutDashboard,
  UserPlus,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import BrandLogo from '@/components/BrandLogo'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
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
  { to: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, configurable: true },
  { to: '/centro-trabajo', labelKey: 'centroDeTrabajo', icon: Factory, configurable: true },
  { to: '/usuarios', labelKey: 'usuarios', icon: Users, configurable: true },
  {
    to: '/registro-personal',
    labelKey: 'registroDePersonal',
    icon: UserPlus,
    configurable: true,
  },
  // 2026-08-28 ("ajustes controlados"): 3 modulos nuevos, mismo patron que
  // los 4 de arriba -- solo navegacion, el permiso real lo resuelve
  // useEffectiveModules() (shared/moduleRegistry.js), nunca una lista de
  // permisos aparte aqui.
  { to: '/kpis', labelKey: 'kpis', icon: BarChart3, configurable: true },
  { to: '/asistencia', labelKey: 'asistencia', icon: CalendarCheck, configurable: true },
  { to: '/auditoria', labelKey: 'auditoria', icon: ClipboardCheck, configurable: true },
  // 2026-08-30: paginas de ayuda/referencia (no son funcionalidad de
  // negocio) -- `configurable: false` + `roles` fijo en vez del sistema de
  // permisos editable (Usuarios -> Gestion de permisos), decision explicita
  // del usuario. Manual de Usuario y Cambios son utiles para cualquier rol;
  // Developer Manual (esquema de BD, arquitectura interna) solo tiene
  // sentido para quien administra el sistema -- tambien bloqueado por rol a
  // nivel de ruta en App.jsx (ProtectedRoute roles=['ADMINISTRADOR']), no
  // solo oculto del menu.
  {
    to: '/manual',
    labelKey: 'userManual',
    icon: BookOpen,
    configurable: false,
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'],
  },
  {
    to: '/developer-manual',
    labelKey: 'developerManual',
    icon: Code2,
    configurable: false,
    roles: ['ADMINISTRADOR'],
  },
  {
    to: '/changelog',
    labelKey: 'changelog',
    icon: History,
    configurable: false,
    roles: ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'],
  },
]

// Estilo de item de menu (rediseño visual 2026-08-28, referencia "sidebar
// blanca/azul"): sin card/borde individual por item (aire visual, lista
// limpia), activo = fondo azul extremadamente claro + texto/icono azul +
// barra vertical azul de 3px pegada al borde izquierdo (via `before:`, nunca
// un elemento aparte) en vez del bgcolor gris grande de antes; hover = mismo
// azul clarito mas un desplazamiento sutil (2px). Nunca toca rutas/permisos/
// orden -- ESTO es exactamente lo mismo NAV_ITEMS/filter de siempre, solo
// cambia la presentacion.
function NavList({ items, onItemClick }) {
  const { t } = useTranslation('navigation')
  return (
    <nav className="flex-1 space-y-1 px-2.5 pt-2">
      {items.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onItemClick}
          className={({ isActive }) =>
            cn(
              'relative flex min-h-[56px] items-center gap-0 rounded-[11px] px-3.5 py-3 text-foreground transition-[background-color,color,transform] duration-[180ms] ease-in-out',
              'hover:translate-x-[2px] hover:bg-[#EFF6FF] dark:hover:bg-[rgba(59,130,246,.14)]',
              isActive &&
                "text-[#3B82F6] bg-[#EFF6FF] dark:bg-[rgba(59,130,246,.18)] before:absolute before:left-1 before:top-[22%] before:bottom-[22%] before:w-[3px] before:rounded before:bg-[#3B82F6] before:content-['']",
            )
          }
        >
          <span className="flex min-w-[34px] items-center text-inherit">
            <Icon size={21} />
          </span>
          <span className="text-[14.5px] font-semibold text-inherit">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}

// Encabezado (2026-08-29, cambio de branding a peticion explicita del
// usuario): la marca general "Centro de Control" / "CONTROL OPERATIVO"
// reemplaza el icono+texto "CENTRO DE TRABAJO FFT" que vivia aqui -- ver
// src/components/BrandLogo.jsx, fuente unica del branding (variant="sidebar",
// pensada para el ancho angosto de esta columna). `onToggle` es exactamente
// el mismo handler que antes (onTogglePin): el boton solo cambia de icono
// (pin -> chevron) y de estilo, el comportamiento de fijar/soltar el menu
// abierto NO cambia.
function SidebarHeader({ onToggle, toggleTitle, pinned }) {
  return (
    <div className="flex min-h-16 items-center gap-2.5 border-b border-border px-3.5 py-3.5">
      <BrandLogo variant="sidebar" className="flex-1" />
      {onToggle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-[rgba(59,130,246,.18)] bg-card transition-colors duration-[180ms] ease-in-out hover:bg-[#EFF6FF] dark:border-[rgba(59,130,246,.35)] dark:hover:bg-[rgba(59,130,246,.16)]"
            >
              <ChevronsLeft
                size={20}
                className="transition-transform duration-[220ms] ease-in-out"
                style={{ color: BRAND_BLUE, transform: pinned ? 'none' : 'rotate(180deg)' }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>{toggleTitle}</TooltipContent>
        </Tooltip>
      )}
    </div>
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
     Sheet (shadcn/Radix Dialog) con backdrop y cierre al seleccionar
     o hacer click afuera -- reemplaza al Drawer de MUI, mismo
     comportamiento (abre/cierra por `open`/`onClose`, sin boton de
     hamburguesa propio: eso lo sigue disparando AppLayout).

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
  // tablet, movil) -- solo cambia el contenedor visual (overlay vs Sheet,
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
      // biome-ignore lint/a11y/noStaticElementInteractions: mismo hotspot de AppLayout.jsx, solo cancela/programa el auto-cierre por hover
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="fixed bottom-0 left-0 top-14 z-[1202] flex flex-col border-r border-border bg-card transition-[transform,box-shadow] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          width: SIDEBAR_WIDTH,
          transform: open || pinned ? 'translateX(0)' : 'translateX(-100%)',
          boxShadow: open || pinned ? '4px 0 20px rgba(15,23,42,0.08)' : 'none',
        }}
      >
        <SidebarHeader
          onToggle={onTogglePin}
          toggleTitle={pinned ? 'Dejar de fijar' : 'Fijar menú abierto'}
          pinned={pinned}
        />
        <NavList items={items} />
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="left" style={{ width: SIDEBAR_WIDTH }} className="flex flex-col">
        <SidebarHeader />
        <NavList items={items} onItemClick={onClose} />
      </SheetContent>
    </Sheet>
  )
}
