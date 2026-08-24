import { useMemo } from 'react'
import dayjs from 'dayjs'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import BarChartIcon from '@mui/icons-material/BarChart'
import { usePageStyles } from '../../ui/pageStyles'
import { KpiCard, EmptyState } from '../../ui'
import { CURRENT_SHIFT } from '../../data/production/catalog'
import { allLineSummaries, generalKpis, buildAlerts } from '../../data/production/selectors'
import { hourlyTrendTotal, HAS_PRODUCTION_SOURCE } from '../../data/production/production'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import ExportMenuButton from '../centro-trabajo/ExportMenuButton'
import ComparisonChart from './ComparisonChart'
import HourlyTrendChart from './HourlyTrendChart'
import AlertsPanel from './AlertsPanel'
import DashboardWorkAreaSection from './DashboardWorkAreaSection'

export default function DashboardPage() {
  const ps = usePageStyles()
  const personnelVersion = usePersonnelVersion()
  const summaries = useMemo(() => allLineSummaries(), [personnelVersion])
  const kpis = useMemo(() => generalKpis(), [personnelVersion])
  const alerts = useMemo(() => buildAlerts(), [personnelVersion])
  const hourlyTotal = useMemo(() => hourlyTrendTotal(), [])
  const today = dayjs()

  const comparisonData = summaries.map(s => ({
    id: s.id, name: s.name, production: s.production, target: s.target, pct: s.pct, accent: s.tone.accent,
  }))

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
            <ExportMenuButton dateISO={today.format('YYYY-MM-DD')} />
          </Stack>
        </Box>
      </Paper>

      {/* KPIs generales — simplificado a 3 (personal, faltante, lineas
          operando); produccion/meta/avance/mayor produccion se retiraron
          a peticion del usuario (no hay fuente real de produccion). */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          {/* Card propia (no KpiCard) -- el usuario confundio "personal
              ideal" (meta por area, suma de idealHeadcount de catalog.js)
              con "cuanta gente hay registrada", porque el formato viejo
              "81 / 137" mezclaba ambos numeros en un solo valor. Aqui van
              apilados y etiquetados por separado a proposito (2026-08-24). */}
          <Paper elevation={0} sx={{
            p: 2.5, height: '100%', borderRadius: 3,
            bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.04 : 0.02),
            border: '1px solid', borderColor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.12),
            borderLeft: '3px solid #3B82F6',
          }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: 2, mb: 1.25,
              bgcolor: alpha('#3B82F6', 0.10), display: 'grid', placeItems: 'center', color: '#3B82F6',
              border: '1px solid', borderColor: alpha('#3B82F6', 0.15),
            }}>
              <PeopleAltIcon sx={{ fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6, mb: 1 }}>
              Personal
            </Typography>

            <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.secondary' }}>
              Personal que hay actualmente
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1, mb: 1, letterSpacing: -0.5 }}>
              {kpis.personalActivo}
            </Typography>

            <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.secondary' }}>
                Personal ideal
              </Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'text.secondary', lineHeight: 1.2 }}>
                {kpis.personalIdeal}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.25 }}>
                Meta de personal por área — no es el total de empleados del sistema.
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard title="Personal faltante" value={`${kpis.personalFaltante}`} subtitle="personas" icon={<PersonOffIcon />} accent={kpis.personalFaltante > 0 ? 'red' : 'green'} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <KpiCard title="Líneas operando" value={`${kpis.lineasOperando} / ${kpis.lineasTotal}`} icon={<PrecisionManufacturingIcon />} accent="cyan" />
        </Grid>
      </Grid>

      {/* Layout del area de trabajo — inmediatamente despues de los KPIs,
          es uno de los elementos principales del Dashboard. */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 3 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Layout del área de trabajo</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>
            Interpretación web del plano real — haz click en una zona para ver su personal
          </Typography>
        </Box>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <DashboardWorkAreaSection />
        </Box>
      </Paper>

      {/* Comparativa por linea */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 3 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Producción por línea</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>Comparativa de todas las líneas y áreas — hoy</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          {HAS_PRODUCTION_SOURCE ? (
            <ComparisonChart data={comparisonData} />
          ) : (
            <EmptyState
              compact
              icon={<BarChartIcon />}
              title="Sin datos de producción todavía"
              description="Este dashboard todavía no tiene una fuente real de piezas producidas conectada."
            />
          )}
        </Box>
      </Paper>

      {/* Tendencia + alertas */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Tendencia por hora</Typography>
              <Typography sx={ps.cardHeaderSubtitle}>Producción total durante el turno</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              {HAS_PRODUCTION_SOURCE ? (
                <HourlyTrendChart data={hourlyTotal} height={230} />
              ) : (
                <EmptyState compact title="Sin datos de producción todavía" />
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <AlertsPanel alerts={alerts} />
        </Grid>
      </Grid>
    </Box>
  )
}
