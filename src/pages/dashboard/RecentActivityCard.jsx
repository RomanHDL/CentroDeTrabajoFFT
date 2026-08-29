import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import CloseIcon from '@mui/icons-material/Close'
import ChartCard from './ChartCard'

const ACTIVITY_ICON = {
  CHECK_IN: { Icon: PersonAddAlt1Icon, color: '#10B981' },
  MOVE: { Icon: SwapHorizIcon, color: '#3B82F6' },
  RELEASE: { Icon: PersonRemoveIcon, color: '#EF4444' },
}

/* "Actividades recientes" (2026-08-26) -- misma fuente que "Movimientos
   del día" (getRecentActivity, dashboardMetrics.js -- getMovementsForDate
   real, ya sincronizada, sin request nuevo). `time` es "HH:mm" real del
   dia de hoy (nunca un timestamp completo ni un "hace X min" fabricado,
   ver dashboardMetrics.js). "Ver todas" reutiliza los mismos datos ya
   obtenidos (hasta 30, ver getRecentActivity), sin una segunda consulta. */
function ActivityRow({ a }) {
  const meta = ACTIVITY_ICON[a.type] || { Icon: SwapHorizIcon, color: '#64748B' }
  const { Icon } = meta
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0, mt: 0.1,
        bgcolor: `${meta.color}22`, display: 'grid', placeItems: 'center', color: meta.color,
      }}>
        <Icon sx={{ fontSize: 14 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }} noWrap>
          {a.employeeName} — {a.label}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>
          {a.type === 'MOVE' && a.fromAreaName && a.toAreaName
            ? `${a.fromAreaName} → ${a.toAreaName}`
            : a.toAreaName || a.fromAreaName || ''} · {a.time}
        </Typography>
      </Box>
    </Stack>
  )
}

export default function RecentActivityCard({ recentActivity, loading }) {
  const [open, setOpen] = useState(false)
  const items = recentActivity || []

  return (
    <>
      <ChartCard
        title="Actividades recientes"
        subtitle="Eventos reales de personal de hoy"
        loading={loading}
        empty={items.length === 0}
        emptyMessage="Todavía no hay actividad registrada hoy."
      >
        <Stack spacing={1.25}>
          {items.slice(0, 6).map((a) => <ActivityRow key={a.id} a={a} />)}
        </Stack>
        {items.length > 6 && (
          <Typography
            component="button"
            onClick={() => setOpen(true)}
            sx={{ fontSize: 11.5, fontWeight: 700, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', p: 0, mt: 1.5, alignSelf: 'flex-start' }}
          >
            Ver todas las actividades
          </Typography>
        )}
      </ChartCard>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
          Actividades de hoy
          <IconButton size="small" onClick={() => setOpen(false)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pb: 1 }}>
            {items.map((a) => <ActivityRow key={a.id} a={a} />)}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  )
}
