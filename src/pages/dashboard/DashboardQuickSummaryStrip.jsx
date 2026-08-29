import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import { usePageStyles } from '../../ui/pageStyles'

/* "Resumen rápido del centro de trabajo" (2026-08-26) -- franja
   horizontal compacta al final del Dashboard, a peticion explicita del
   usuario ("NO duplicar cards gigantes"). Todos los valores ya vienen
   calculados por useDashboardMetrics() -- esta card no computa nada
   nuevo, solo re-muestra en compacto lo que las cards/graficas de arriba
   ya mostraron en detalle (misma fuente, cero calculo propio). */
function Item({ label, value, loading }) {
  return (
    <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.1, flex: '1 1 140px', minWidth: 120 }}>
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <Skeleton width={48} height={26} />
      ) : (
        <Typography sx={{ fontSize: 19, fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
      )}
    </Box>
  )
}

export default function DashboardQuickSummaryStrip({ metrics, loading }) {
  const ps = usePageStyles()
  const areasTotal = metrics?.areas?.length ?? 0
  const coverage = metrics?.kpis?.coveragePct != null ? `${metrics.kpis.coveragePct}%` : 'Sin meta'

  return (
    <Paper elevation={0} sx={{ ...ps.card, mt: 2, overflow: 'hidden' }}>
      <Box sx={ps.cardHeader}>
        <Typography sx={ps.cardHeaderTitle}>Resumen rápido del centro de trabajo</Typography>
      </Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        divider={<Box sx={{ borderColor: 'divider' }} />}
        sx={{
          '& > div': { borderBottom: { xs: '1px solid', sm: 'none' }, borderColor: 'divider' },
        }}
      >
        <Item label="Áreas totales" value={areasTotal} loading={loading} />
        <Item
          label="Personal en turno"
          value={metrics?.kpis?.personalActual ?? 0}
          loading={loading}
        />
        <Item
          label="Personas faltantes"
          value={metrics?.kpis?.personalFaltante ?? 0}
          loading={loading}
        />
        <Item
          label="Líneas operativas"
          value={metrics ? `${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}` : '—'}
          loading={loading}
        />
        <Item label="Cobertura general" value={coverage} loading={loading} />
        <Item
          label="Movimientos hoy"
          value={metrics?.dailyMovements?.total ?? 0}
          loading={loading}
        />
      </Stack>
    </Paper>
  )
}
