import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import ChartCard from './ChartCard'

/* "Movimientos del día" (2026-08-26) -- desglose real de
   EmployeeMovement/DailyAssignment de HOY (getDailyMovementsBreakdown,
   dashboardMetrics.js): Asignaciones=CHECK_IN, Removidos=RELEASE,
   Movimientos=MOVE, Neto=Asignaciones-Removidos. Nunca compara "vs
   ayer" -- no existe ese histórico agregado por dia hoy (ver
   MovementsDailyCard, que sí tiene su propia fuente real de 7 dias por
   separado si se necesita esa comparación). */
function Row({ icon, label, value, color }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ py: 0.75 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          bgcolor: `${color}22`,
          color,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', flex: 1 }}>{label}</Typography>
      <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{value}</Typography>
    </Stack>
  )
}

export default function DailyMovementsSummaryCard({ dailyMovements, loading }) {
  const d = dailyMovements || { asignaciones: 0, removidos: 0, movimientos: 0, neto: 0, total: 0 }
  return (
    <ChartCard
      title="Movimientos del día"
      subtitle="Asignaciones, liberaciones y reasignaciones de hoy"
      loading={loading}
      empty={d.total === 0}
      emptyMessage="Todavía no hay movimientos registrados hoy."
    >
      <Stack
        spacing={0}
        divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
      >
        <Row
          icon={<ArrowUpwardIcon sx={{ fontSize: 16 }} />}
          label="Asignaciones"
          value={d.asignaciones}
          color="#10B981"
        />
        <Row
          icon={<ArrowDownwardIcon sx={{ fontSize: 16 }} />}
          label="Removidos / Liberados"
          value={d.removidos}
          color="#EF4444"
        />
        <Row
          icon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
          label="Movimientos / Reasignaciones"
          value={d.movimientos}
          color="#3B82F6"
        />
      </Stack>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ pt: 1.25, mt: 0.5, borderTop: '2px solid', borderColor: 'divider' }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            bgcolor: d.neto >= 0 ? '#10B98122' : '#EF444422',
            color: d.neto >= 0 ? '#10B981' : '#EF4444',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <TrendingFlatIcon sx={{ fontSize: 16 }} />
        </Box>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>Neto</Typography>
        <Typography
          sx={{ fontSize: 17, fontWeight: 800, color: d.neto >= 0 ? '#10B981' : '#EF4444' }}
        >
          {d.neto > 0 ? `+${d.neto}` : d.neto}
        </Typography>
      </Stack>
    </ChartCard>
  )
}
