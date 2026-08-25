import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Badge from '@mui/material/Badge'
import Popover from '@mui/material/Popover'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CloseIcon from '@mui/icons-material/Close'
import dayjs from 'dayjs'
import { workCenterById } from '../data/production/catalog'
import { getPendingMoves } from '../data/personnel/repository'
import { approvePendingMoveWithToast, rejectPendingMoveWithToast } from '../data/personnel/moveApprovalActions'
import { usePersonnelVersion } from '../data/personnel/usePersonnelVersion'
import { useIsTouchDevice } from '../ui/useIsTouchDevice'

function areaName(id) {
  return workCenterById(id)?.name || id || '—'
}

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.max(0, dayjs().diff(dayjs(iso), 'minute'))
  if (mins < 1) return 'Hace un momento'
  if (mins === 1) return 'Hace 1 min'
  return `Hace ${mins} min`
}

function MoveRow({ move, userId, onResolved, compact }) {
  return (
    <Box sx={{ p: compact ? 0 : 1.25, borderRadius: 2, ...(compact ? {} : { bgcolor: 'action.hover' }) }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>
        {move.employeeNumber && move.employeeNumber !== 'PROYECTO' ? `${move.employeeNumber} — ` : ''}{move.employeeName}
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        {areaName(move.fromAreaId)} → {areaName(move.toAreaId)}
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
        Solicitado por: {move.requestedByName || 'otro usuario'} · {timeAgo(move.requestedAt)}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          size="small" color="error" variant="outlined"
          onClick={() => { rejectPendingMoveWithToast(move.id, userId); onResolved && onResolved(move.id) }}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Rechazar
        </Button>
        <Button
          size="small" color="success" variant="contained"
          onClick={() => { approvePendingMoveWithToast(move.id, userId); onResolved && onResolved(move.id) }}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Aprobar
        </Button>
      </Stack>
    </Box>
  )
}

/* Campana de aprobaciones -- visible solo para SUPERVISOR/ADMINISTRADOR (mismo gate que ya usa
   PersonalDeHoyTab.jsx para su card de "Movimientos pendientes"). Lee getPendingMoves() (ya
   sincronizado entre dispositivos por apiSync.js, ver Cambio 4) y reutiliza approve/rejectMove
   con toast (moveApprovalActions.js) -- no duplica esa logica.

   Ademas muestra una notificacion flotante (no autodescartable como un toast) cuando aparece una
   solicitud NUEVA que este usuario todavia no habia visto -- se cierra sola al resolverse, o el
   usuario puede ocultarla manualmente sin que eso rechace la solicitud (sigue en la campana). */
export default function NotificationBell({ userId }) {
  const version = usePersonnelVersion()
  const isTouch = useIsTouchDevice()
  const [anchorEl, setAnchorEl] = useState(null)
  const [floating, setFloating] = useState(null) // { move, extraCount }
  const seenIds = useRef(new Set())
  const dismissedIds = useRef(new Set())
  const initialized = useRef(false)

  const pendingMoves = getPendingMoves()

  useEffect(() => {
    if (!initialized.current) {
      // Primera carga: no mostrar flotante para solicitudes que ya existian antes de abrir la
      // app (solo para las que aparezcan DESPUES, en vivo).
      pendingMoves.forEach((m) => seenIds.current.add(m.id))
      initialized.current = true
      return
    }
    const fresh = pendingMoves.filter((m) => !seenIds.current.has(m.id))
    fresh.forEach((m) => seenIds.current.add(m.id))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  if (!userId) return null

  return (
    <>
      <Tooltip title="Movimientos pendientes de aprobación">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <Badge badgeContent={pendingMoves.length} color="error">
            <NotificationsIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 320, maxHeight: 420, overflowY: 'auto', p: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 1 }}>Aprobaciones pendientes</Typography>
          {pendingMoves.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 1 }}>No hay solicitudes pendientes.</Typography>
          ) : (
            <Stack spacing={1} divider={<Divider />}>
              {pendingMoves.map((m) => (
                <MoveRow key={m.id} move={m} userId={userId} compact />
              ))}
            </Stack>
          )}
        </Box>
      </Popover>

      {floating && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            zIndex: (t) => t.zIndex.modal + 1,
            width: { xs: 'calc(100% - 24px)', sm: 340 },
            borderRadius: 3,
            p: 1.75,
            ...(isTouch
              ? { left: 12, right: 12, bottom: 12 } // tablet: abajo, no tapa el modal de registro
              : { top: 68, right: 16 }),
          }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Typography sx={{ fontWeight: 800, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              🔔 Solicitud de cambio de área
            </Typography>
            <IconButton size="small" onClick={() => { dismissedIds.current.add(floating.move.id); setFloating(null) }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Box sx={{ mt: 0.5 }}>
            <MoveRow move={floating.move} userId={userId} onResolved={() => setFloating(null)} />
          </Box>
          {floating.extraCount > 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
              +{floating.extraCount} solicitud{floating.extraCount > 1 ? 'es' : ''} más en la campana.
            </Typography>
          )}
        </Paper>
      )}
    </>
  )
}
