import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

/* KPI ejecutivo del Dashboard rediseñado (2026-08-25, contrato visual
   exacto del mockup aprobado por el usuario) -- COMPONENTE NUEVO, no
   reemplaza DashboardKpiCard.jsx (ese sigue en uso real por
   PersonalDeHoyTab.jsx en Centro de Trabajo, fuera de alcance de este
   rediseño exclusivo del Dashboard, ver Parte 61 del prompt).

   Sin sparkline/comparación "vs ayer": el prompt lo pide SOLO si existe
   un dato histórico real comparable, y no existe (el total de personal
   de hoy sale en su mayoría del snapshot estático sin fecha, no de un
   registro diario con el que comparar "ayer" de forma honesta) -- se
   omite por completo en vez de inventar una tendencia. */
export default function DashboardExecKpiCard({
  icon,
  accent,
  title,
  value,
  unit,
  footerLabel,
  footerValue,
  progressPct,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        minHeight: 128,
        borderRadius: '16px',
        p: 2,
        border: '1px solid',
        borderColor: alpha(accent, 0.16),
        bgcolor: (t) => alpha(accent, t.palette.mode === 'dark' ? 0.05 : 0.025),
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: alpha(accent, 0.14),
            display: 'grid',
            placeItems: 'center',
            color: accent,
            '& .MuiSvgIcon-root': { fontSize: 19 },
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.secondary' }}>
          {title}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="baseline" spacing={0.75}>
        <Typography
          sx={{ fontSize: 32, fontWeight: 800, color: accent, lineHeight: 1, letterSpacing: -0.5 }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 600 }}>
            {unit}
          </Typography>
        )}
      </Stack>

      <Box sx={{ mt: 'auto' }}>
        {progressPct != null && (
          <Box
            sx={{
              height: 6,
              borderRadius: 999,
              bgcolor: alpha(accent, 0.14),
              overflow: 'hidden',
              mb: 0.5,
            }}
          >
            <Box
              sx={{ width: `${progressPct}%`, height: '100%', bgcolor: accent, borderRadius: 999 }}
            />
          </Box>
        )}
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>
          {footerLabel}
          {footerValue != null ? `: ${footerValue}` : ''}
        </Typography>
      </Box>
    </Paper>
  )
}
