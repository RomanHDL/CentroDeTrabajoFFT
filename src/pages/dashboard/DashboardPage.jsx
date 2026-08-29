import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import ShieldIcon from '@mui/icons-material/Shield'
import RefreshIcon from '@mui/icons-material/Refresh'
import dayjs from 'dayjs'
import { usePageStyles } from '../../ui/pageStyles'
import { getCurrentShift } from '../../data/production/catalog'
import { useDashboardMetrics } from '../../data/dashboard/useDashboardMetrics'
import DashboardExecKpiCard from './DashboardExecKpiCard'
import DashboardExportButton from './DashboardExportButton'
import FindingsCard from './FindingsCard'
import FftIndicatorsCard from './FftIndicatorsCard'
import DailyMovementsSummaryCard from './DailyMovementsSummaryCard'
import RecentActivityCard from './RecentActivityCard'
import DashboardQuickSummaryStrip from './DashboardQuickSummaryStrip'
import CoverageDonutCard from './charts/CoverageDonutCard'
import AreaStatusDonutCard from './charts/AreaStatusDonutCard'
import ShiftDistributionDonutCard from './charts/ShiftDistributionDonutCard'
import MissingVsIdealComboCard from './charts/MissingVsIdealComboCard'

/* ─────────────────────────────────────────────
   Dashboard rediseñado (2026-08-25, extendido 2026-08-26 a peticion
   explicita del usuario -- "el Dashboard debe ser la representacion
   analitica del mismo estado que ya usa todo Centro de Trabajo") --
   centro de control real del área, apoyado 100% en datos reales
   existentes (personal/asistencia/asignaciones/áreas/líneas/plantilla/
   movimientos). Sin producción ficticia, sin Layout 2D, sin accesos
   rápidos -- todo el espacio es analítica real. Toda la aritmética vive
   en useDashboardMetrics()/dashboardMetrics.js, una sola capa de cálculo
   central (nunca una segunda definición de real/ideal/faltante/cobertura
   por gráfica) -- reutiliza directamente getStaffingTotals/
   classifyAreaStatus/AREA_STATUS_META de personnelByArea.js (la MISMA
   fuente que Centro de Trabajo) y getCurrentShift/OFFICIAL_SHIFTS de
   catalog.js.

   2026-08-26: se quitaron de esta pagina "Personal por área" (barra) y
   "Movimientos por hora/día" (MovementsHourlyCard/MovementsDailyCard) --
   NO son datos falsos (ambas siguen siendo reales, backing en
   /api/dashboard/trends), simplemente el nuevo orden visual exacto que
   pidio el usuario ya no las incluye. Los componentes NO se borraron
   (quedan disponibles si se piden de vuelta), solo se dejaron de
   renderizar aqui -- decision documentada en el reporte final de esa
   tarea. */
export default function DashboardPage() {
  const ps = usePageStyles()
  const metrics = useDashboardMetrics()
  const today = dayjs()
  const currentShift = getCurrentShift()

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={{
          ...ps.cardHeader,
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 1.5,
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={ps.pageTitle}>Dashboard</Typography>
            <Typography sx={ps.pageSubtitle}>Resumen general del centro de trabajo</Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              icon={<WbSunnyIcon sx={{ fontSize: 16 }} />}
              label={`Turno: ${currentShift.label}`}
              sx={{ ...ps.metricChip('info'), fontWeight: 700 }}
            />
            <Chip label={`Hoy: ${today.format('DD MMMM YYYY')}`} sx={ps.metricChip('default')} />
            <DashboardExportButton metrics={metrics} />
          </Stack>
        </Box>
      </Paper>

      {/* Fila 1 -- 5 KPIs ejecutivos, ORDEN EXACTO pedido 2026-08-26:
          Personal actual, Personal faltante, Plantilla ideal, Líneas
          operando, Cobertura total (antes: Plantilla ideal primero). */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <DashboardExecKpiCard
            icon={<PeopleAltIcon />} accent="#3B82F6" title="Personal actual"
            value={metrics.kpis.personalActual} unit="personas en turno"
            footerLabel="Ideal" footerValue={metrics.kpis.personalIdeal}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <DashboardExecKpiCard
            icon={<PersonOffIcon />} accent="#EF4444" title="Personal faltante"
            value={metrics.kpis.personalFaltante} unit="personas faltantes"
            footerLabel={metrics.kpis.faltantePct != null ? `${metrics.kpis.faltantePct}% del ideal` : 'Sin plantilla ideal'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <DashboardExecKpiCard
            icon={<TrackChangesIcon />} accent="#A855F7" title="Plantilla ideal"
            value={metrics.kpis.personalIdeal} unit="personas"
            footerLabel="Total ideal definida"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <DashboardExecKpiCard
            icon={<PrecisionManufacturingIcon />} accent="#06B6D4" title="Líneas operando"
            value={`${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}`} unit="líneas operativas"
            footerLabel={metrics.kpis.lineasTotal > 0 ? `${Math.round((metrics.kpis.lineasOperando / metrics.kpis.lineasTotal) * 100)}% de las líneas` : ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <DashboardExecKpiCard
            icon={<ShieldIcon />} accent="#10B981" title="Cobertura total"
            value={metrics.kpis.coveragePct != null ? `${metrics.kpis.coveragePct}%` : '—'} unit="de cobertura general"
            progressPct={metrics.kpis.coverageBarPct}
            footerLabel={`${metrics.totals.realTotal} / ${metrics.totals.idealTotal} del ideal`}
          />
        </Grid>
      </Grid>

      {/* Fila 2 -- Cobertura por área | Faltante vs ideal por área | Estado de las áreas */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6} lg={4}>
          <CoverageDonutCard areas={metrics.areas} coveragePct={metrics.kpis.coveragePct} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <MissingVsIdealComboCard areas={metrics.areas} />
        </Grid>
        <Grid item xs={12} md={12} lg={4}>
          <AreaStatusDonutCard statusCounts={metrics.statusCounts} />
        </Grid>
      </Grid>

      {/* Fila 3 -- Distribución por turno | Movimientos del día | Actividades recientes */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6} lg={4}>
          <ShiftDistributionDonutCard shifts={metrics.shifts} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DailyMovementsSummaryCard dailyMovements={metrics.dailyMovements} />
        </Grid>
        <Grid item xs={12} md={12} lg={4}>
          <RecentActivityCard recentActivity={metrics.recentActivity} />
        </Grid>
      </Grid>

      {/* Fila 4 -- Hallazgos del día | Indicadores FFT */}
      <Grid container spacing={2} sx={{ mb: 1.5 }}>
        <Grid item xs={12} md={7}>
          <FindingsCard findings={metrics.findings} />
        </Grid>
        <Grid item xs={12} md={5}>
          <FftIndicatorsCard />
        </Grid>
      </Grid>

      {/* Resumen rápido del centro de trabajo -- franja compacta final */}
      <DashboardQuickSummaryStrip metrics={metrics} />

      {/* Ultima actualizacion -- discreto, nunca una card grande */}
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ opacity: 0.65, mt: 1.5 }}>
        <RefreshIcon sx={{ fontSize: 13 }} />
        <Typography sx={{ fontSize: 11 }}>Última actualización: {metrics.updatedAt.format('hh:mm A')}</Typography>
      </Stack>
    </Box>
  )
}
