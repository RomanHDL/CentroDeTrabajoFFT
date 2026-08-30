import dayjs from 'dayjs'
import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  approvePendingMoveWithToast,
  rejectPendingMoveWithToast,
} from '../data/personnel/moveApprovalActions'
import { getPendingMoves } from '../data/personnel/repository'
import { usePersonnelVersion } from '../data/personnel/usePersonnelVersion'
import { workCenterById } from '../data/production/catalog'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'

function areaName(id) {
  return workCenterById(id)?.name || id || '—'
}

function timeAgo(iso, t) {
  if (!iso) return ''
  const mins = Math.max(0, dayjs().diff(dayjs(iso), 'minute'))
  if (mins < 1) return t('notificationBell.haceUnMomento')
  if (mins === 1) return t('notificationBell.hace1Min')
  return t('notificationBell.haceNMin', { mins })
}

// Fase 6c: reemplaza el Box con sx condicional (compact ? {} : bgcolor
// action.hover) -- mismo criterio, como className con cn().
function MoveRow({ move, userId, onResolved, compact }) {
  const { t } = useTranslation('layout')
  return (
    <div className={cn('rounded-[20px]', compact ? 'p-0' : 'bg-accent p-2.5')}>
      <p className="text-[13.5px] font-extrabold">
        {move.employeeNumber && move.employeeNumber !== 'PROYECTO'
          ? `${move.employeeNumber} — `
          : ''}
        {move.employeeName}
      </p>
      <p className="text-[12.5px] text-muted-foreground">
        {areaName(move.fromAreaId)} → {areaName(move.toAreaId)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {t('notificationBell.solicitadoPor', {
          name: move.requestedByName || t('notificationBell.otroUsuario'),
          time: timeAgo(move.requestedAt, t),
        })}
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-red-500 font-bold text-red-500 hover:bg-red-500/10"
          onClick={() => {
            rejectPendingMoveWithToast(move.id, userId)
            onResolved?.(move.id)
          }}
        >
          {t('notificationBell.rechazar')}
        </Button>
        <Button
          size="sm"
          variant="success"
          className="font-bold"
          onClick={() => {
            approvePendingMoveWithToast(move.id, userId)
            onResolved?.(move.id)
          }}
        >
          {t('notificationBell.aprobar')}
        </Button>
      </div>
    </div>
  )
}

/* Campana de aprobaciones -- visible solo para SUPERVISOR/ADMINISTRADOR (mismo gate que ya usa
   PersonalDeHoyTab.jsx para su card de "Movimientos pendientes"). Lee getPendingMoves() (ya
   sincronizado entre dispositivos por apiSync.js, ver Cambio 4) y reutiliza approve/rejectMove
   con toast (moveApprovalActions.js) -- no duplica esa logica.

   Ademas muestra una notificacion flotante (no autodescartable como un toast) cuando aparece una
   solicitud NUEVA que este usuario todavia no habia visto -- se cierra sola al resolverse, o el
   usuario puede ocultarla manualmente sin que eso rechace la solicitud (sigue en la campana).

   Fase 6c: convertido de MUI (IconButton/Tooltip/Badge/Popover/Paper/Typography/Stack/Button/
   Divider + sx) a Tailwind + shadcn/ui (Popover controlado con open/onOpenChange en vez del
   anchorEl manual de MUI, mismo resultado -- abre/cierra por click en la campana; Badge para el
   contador, con los mismos colores bracket-hex ya establecidos en badge.jsx) + lucide-react.
   NotificationsIcon -> Bell, CloseIcon -> X. El boton de la campana usa un atributo `title`
   nativo en vez de un Tooltip Radix, para no anidarlo con el propio PopoverTrigger sobre el mismo
   elemento (mismo criterio que HeaderUserActions.jsx). */
export default function NotificationBell({ userId }) {
  const { t } = useTranslation('layout')
  const version = usePersonnelVersion()
  const isTouch = useIsTouchDevice()
  const [open, setOpen] = useState(false)
  const [floating, setFloating] = useState(null) // { move, extraCount }
  const seenIds = useRef(new Set())
  const dismissedIds = useRef(new Set())
  const initialized = useRef(false)

  const pendingMoves = getPendingMoves()

  // Se ejecuta a proposito solo cuando cambia `version` (nuevo evento de personnel), no en cada
  // render por el array/funciones nuevos que devuelve getPendingMoves() -- mismo criterio que ya
  // tenia el eslint-disable-next-line original de este efecto.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo depende de version, ver comentario arriba
  useEffect(() => {
    if (!initialized.current) {
      // Primera carga: no mostrar flotante para solicitudes que ya existian antes de abrir la
      // app (solo para las que aparezcan DESPUES, en vivo).
      pendingMoves.forEach((m) => {
        seenIds.current.add(m.id)
      })
      initialized.current = true
      return
    }
    const fresh = pendingMoves.filter((m) => !seenIds.current.has(m.id))
    fresh.forEach((m) => {
      seenIds.current.add(m.id)
    })
    const stillPendingIds = new Set(pendingMoves.map((m) => m.id))
    // Si la que se estaba mostrando ya se resolvio (ya no esta pendiente), quitarla.
    setFloating((prev) => {
      if (prev && !stillPendingIds.has(prev.move.id)) return null
      return prev
    })
    if (fresh.length) {
      const [mostRecent, ...rest] = fresh
      if (!dismissedIds.current.has(mostRecent.id)) {
        setFloating({ move: mostRecent, extraCount: rest.length })
      }
    }
  }, [version])

  if (!userId) return null

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={t('notificationBell.movimientosPendientesTitle')}
            className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-colors duration-200 hover:bg-accent"
          >
            <span className="relative inline-flex">
              <Bell size={20} />
              {pendingMoves.length > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] items-center justify-center rounded-full border-transparent bg-[#EF4444] px-1 text-[10px] leading-none text-white">
                  {pendingMoves.length}
                </Badge>
              )}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="max-h-[420px] w-80 overflow-y-auto p-3">
          <p className="mb-2 text-sm font-extrabold">
            {t('notificationBell.aprobacionesPendientes')}
          </p>
          {pendingMoves.length === 0 ? (
            <p className="py-2 text-[13px] text-muted-foreground">
              {t('notificationBell.noHaySolicitudesPendientes')}
            </p>
          ) : (
            <div className="flex flex-col gap-2 divide-y divide-border">
              {pendingMoves.map((m) => (
                <MoveRow key={m.id} move={m} userId={userId} compact />
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {floating && (
        <div
          className={cn(
            'fixed z-[1301] w-[calc(100%-24px)] rounded-[30px] border border-border bg-card p-3.5 text-card-foreground shadow-xl sm:w-[340px]',
            isTouch ? 'inset-x-3 bottom-3' : 'right-4 top-[68px]', // tablet: abajo, no tapa el modal de registro
          )}
        >
          <div className="flex items-start justify-between">
            <p className="flex items-center gap-1 text-[13.5px] font-extrabold">
              {t('notificationBell.solicitudCambioArea')}
            </p>
            <button
              type="button"
              onClick={() => {
                dismissedIds.current.add(floating.move.id)
                setFloating(null)
              }}
              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1">
            <MoveRow move={floating.move} userId={userId} onResolved={() => setFloating(null)} />
          </div>
          {floating.extraCount > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t('notificationBell.masEnCampana', { count: floating.extraCount })}
            </p>
          )}
        </div>
      )}
    </>
  )
}
