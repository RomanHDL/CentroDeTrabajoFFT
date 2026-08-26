import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import ShieldIcon from '@mui/icons-material/Shield'
import RefreshIcon from '@mui/icons-material/Refresh'
import dayjs from 'dayjs'
import { usePageStyles } from '../../ui/pageStyles'
import { CURRENT_SHIFT } from '../../data/production/catalog'
import { useDashboardMetrics } from '../../data/dashboard/useDashboardMetrics'
import DashboardExecKpiCard from './DashboardExecKpiCard'
import DashboardExportButton from './DashboardExportButton'
import FindingsCard from './FindingsCard'
import CoverageDonutCard from './charts/CoverageDonutCard'
import AreaStatusDonutCard from './charts/AreaStatusDonutCard'
import MovementsHourlyCard from './charts/MovementsHourlyCard'
import PersonnelByAreaBarCard from './charts/PersonnelByAreaBarCard'
import MissingVsIdealComboCard from './charts/MissingVsIdealComboCard'
import MovementsDailyCard from './charts/MovementsDailyCard'

/* ─────────────────────────────────────────────
   Dashboard rediseñado (2026-08-25, contrato visual exacto del mockup
   aprobado por el usuario) -- centro de control real del área,
   apoyado 100% en datos reales existentes (personal/asistencia/
   asignaciones/áreas/líneas/plantilla/movimientos). Sin producción
   ficticia (se quitaron "Producción por línea" y "Tendencia por hora",
   que dependían de HAS_PRODUCTION_SOURCE=false), sin Layout 2D, sin
   accesos rápidos -- todo el espacio es analítica real. Toda la
   aritmética vive en useDashboardMetrics()/dashboardMetrics.js, una
   sola capa de cálculo central (nunca una segunda definición de
   real/ideal/faltante/cobertura por gráfica). */
export default function DashboardPage() {
  const ps = usePageStyles()
  const metrics = useDashboardMetrics()
  const today = dayjs()

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
              label={`Turno: ${CURRENT_SHIFT}`}
              sx={{ ...ps.metricChip('info'), fontWeight: 700 }}
            />
            <Chip label={`Hoy: ${today.format('DD MMMM YYYY')}`} sx={ps.metricChip('default')} />
            <DashboardExportButton metrics={metrics} />
          </Stack>
        </Box>
      </Paper>

      {/* Fila 1 -- 4 KPIs ejecutivos */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardExecKpiCard
            icon={<PeopleAltIcon />} accent="#3B82F6" title="Personal actual"
            value={metrics.kpis.personalActual} unit="personas en turno"
            footerLabel="Ideal" footerValue={metrics.kpis.personalIdeal}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardExecKpiCard
            icon={<PersonOffIcon />} accent="#EF4444" title="Personal faltante"
            value={metrics.kpis.personalFaltante} unit="personas faltantes"
            footerLabel={metrics.kpis.faltantePct != null ? `${metrics.kpis.faltantePct}% del ideal` : 'Sin plantilla ideal'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardExecKpiCard
            icon={<PrecisionManufacturingIcon />} accent="#06B6D4" title="Líneas operando"
            value={`${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}`} unit="líneas operativas"
            footerLabel={metrics.kpis.lineasTotal > 0 ? `${Math.round((metrics.kpis.lineasOperando / metrics.kpis.lineasTotal) * 100)}% de las líneas` : ''}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardExecKpiCard
            icon={<ShieldIcon />} accent="#10B981" title="Cobertura total"
            value={metrics.kpis.coveragePct != null ? `${metrics.kpis.coveragePct}%` : '—'} unit="de cobertura general"
            progressPct={metrics.kpis.coverageBarPct}
            footerLabel={`${metrics.totals.realTotal} / ${metrics.totals.idealTotal} del ideal`}
          />
        </Grid>
      </Grid>

      {/* Fila 2 -- 3 graficas principales (30% | 40% | 30%) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4} lg={3.6}>
          <CoverageDonutCard areas={metrics.areas} coveragePct={metrics.kpis.coveragePct} />
        </Grid>
        <Grid item xs={12} md={4} lg={4.8}>
          <MovementsHourlyCard hourlyToday={metrics.trends.hourlyToday} loading={metrics.trends.loading} error={metrics.trends.error} />
        </Grid>
        <Grid item xs={12} md={4} lg={3.6}>
          <AreaStatusDonutCard statusCounts={metrics.statusCounts} />
        </Grid>
      </Grid>

      {/* Fila 3 -- Personal por área (40%) | Faltante vs ideal (60%) */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={5}>
          <PersonnelByAreaBarCard areas={metrics.areas} />
        </Grid>
        <Grid item xs={12} md={7}>
          <MissingVsIdealComboCard areas={metrics.areas} />
        </Grid>
      </Grid>

      {/* Fila 4 -- Movimientos por día (50%) | Hallazgos del día (50%) */}
      <Grid container spacing={2} sx={{ mb: 1.5 }}>
        <Grid item xs={12} md={6}>
          <MovementsDailyCard dailyLast7={metrics.trends.dailyLast7} loading={metrics.trends.loading} error={metrics.trends.error} />
        </Grid>
        <Grid item xs={12} md={6}>
          <FindingsCard findings={metrics.findings} />
        </Grid>
      </Grid>

      {/* Ultima actualizacion -- discreto, nunca una card grande (Parte 44) */}
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ opacity: 0.65 }}>
        <RefreshIcon sx={{ fontSize: 13 }} />
        <Typography sx={{ fontSize: 11 }}>Última actualización: {metrics.updatedAt.format('hh:mm A')}</Typography>
      </Stack>
    </Box>
  )
}
