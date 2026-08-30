import { Check, KeyRound, Languages, LogOut, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '../state/auth'
import NotificationBell from './NotificationBell'
import { ROLE_LABELS } from './roleLabels'

// Fase 4 (i18n, MI Stack Reference sección 10) -- nombres reales en su
// propio idioma (nunca traducidos), convencion estandar de selectores de
// idioma. Mismos 3 codigos que public/locales/ y src/i18n.js
// supportedLngs.
const LANGUAGES = [
  { code: 'es-MX', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '中文' },
]

function initialsOf(name) {
  return (
    (name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  )
}

/* 2026-08-27 ("rediseño del header de Centro de Trabajo", a peticion
   explicita del usuario): campana + modo claro/oscuro + perfil (avatar +
   nombre + rol + menu de cuenta), EXTRAIDO tal cual de AppLayout.jsx (misma
   logica/handlers/datos reales de useAuth, cero duplicacion) para poder
   reutilizarlo tanto en la barra superior global (AppLayout.jsx, todas las
   demas paginas) como en el nuevo header propio de Centro de Trabajo
   (CentroTrabajoPage.jsx) sin mantener dos copias de este bloque.

   Fase 6c: convertido de MUI (IconButton/Tooltip/Avatar/Menu/MenuItem/
   Divider/ListItemIcon + sx) a Tailwind + shadcn/ui (DropdownMenu para el
   selector de idioma y el menu de cuenta, Tooltip solo para el toggle
   claro/oscuro -- un boton de accion directa, mismo patron ya usado por el
   toggle de fijado en Sidebar.jsx) + lucide-react. Los botones que ademas
   disparan un menu (idioma, avatar) usan un atributo `title` nativo en vez
   de envolverlos en Tooltip, para no anidar dos primitivos Radix (Tooltip +
   DropdownMenu) sobre el mismo elemento -- mismo criterio que los botones
   de icono de UsuariosPage.jsx. Los menus ya no necesitan estado propio de
   anchorEl: DropdownMenu de Radix maneja su open/close sin controlar (no
   controlled), por eso ya no hace falta useState aqui. Iconos MUI -> lucide:
   TranslateIcon -> Languages, DarkModeIcon -> Moon, LightModeIcon -> Sun,
   LockResetIcon -> KeyRound (mismo icono que ya usa UsuariosPage.jsx para
   "Restablecer contraseña"), LogoutIcon -> LogOut, CheckIcon -> Check. */
export default function HeaderUserActions({ mode, setMode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  const roleLabel = ROLE_LABELS[user?.role] || user?.role
  const canApproveMoves = user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRADOR'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {canApproveMoves && <NotificationBell userId={user?.id} />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Idioma / Language / 语言"
            className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-colors duration-200 hover:bg-blue-500/[0.10] dark:hover:bg-blue-400/[0.14]"
          >
            <Languages size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANGUAGES.map((lng) => (
            <DropdownMenuItem key={lng.code} onClick={() => i18n.changeLanguage(lng.code)}>
              <span className="mr-2 flex h-4 w-4 items-center justify-center">
                {i18n.resolvedLanguage === lng.code && <Check className="h-4 w-4" />}
              </span>
              {lng.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
            className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-colors duration-200 hover:bg-blue-500/[0.10] dark:hover:bg-blue-400/[0.14]"
          >
            {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{mode === 'light' ? 'Modo oscuro' : 'Modo claro'}</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title={`${user?.name || ''} · Mi cuenta`}
            className="ml-1 flex items-center gap-2 rounded-[20px] px-2 py-1 transition-colors duration-200 hover:bg-accent"
          >
            <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#3B82F6] text-sm font-bold text-white">
              {initialsOf(user?.name)}
            </span>
            <span className="hidden text-left leading-[1.1] sm:block">
              <p className="text-[13px] font-bold">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <div className="px-4 py-2">
            <p className="text-[13px] font-bold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel} · Mi cuenta</p>
          </div>
          <div className="-mx-1 my-1 h-px bg-border" />
          {user?.role === 'ADMINISTRADOR' && (
            <DropdownMenuItem onClick={() => navigate('/cambiar-contrasena')}>
              <KeyRound className="mr-2 h-4 w-4" />
              Cambiar contraseña
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
