import React, { useMemo } from 'react'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import FlagIcon from '@mui/icons-material/Flag'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import BarChartIcon from '@mui/icons-material/BarChart'
import { usePageStyles } from '../../ui/pageStyles'
import { KpiCard, EmptyState } from '../../ui'
import { allLineSummaries, generalKpis, buildAlerts } from '../../data/production/selectors'
import { hourlyTrendTotal, HAS_PRODUCTION_SOURCE } from '../../data/production/production'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import ComparisonChart from './ComparisonChart'
import HourlyTrendChart from './HourlyTrendChart'
import AreasLayoutView from './AreasLayoutView'
import AlertsPanel from './AlertsPanel'

export default function DashboardTab({ onOpenLine }) {
  const ps = usePageStyles()
  const personnelVersion = usePersonnelVersion()
  const summaries = useMemo(() => allLineSummaries(), [personnelVersion])
  const kpis = useMemo(() => generalKpis(), [personnelVersion])
  const alerts = useMemo(() => buildAlerts(), [personnelVersion])
  const hourlyTotal = useMemo(() => hourlyTrendTotal(), [])

  const comparisonData = summaries.map(s => ({
    id: s.id, name: s.name, production: s.production, target: s.target, pct: s.pct, accent: s.tone.accent,
  }))

  return (
    <Box>
      {/* KPIs generales */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Personal presente hoy" value={kpis.personalActivo} icon={<PeopleAltIcon />} accent="blue" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Producción de hoy" value={kpis.produccionHoy.toLocaleString('es-MX')} subtitle="piezas" icon={<Inventory2Icon />} accent="blue" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Meta del día" value={kpis.metaDia.toLocaleString('es-MX')} subtitle="piezas" icon={<FlagIcon />} accent="slate" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            title="Avance"
            value={HAS_PRODUCTION_SOURCE ? `${kpis.avancePct ?? 0}%` : 'Sin datos'}
            icon={<TrendingUpIcon />}
            accent={!HAS_PRODUCTION_SOURCE ? 'slate' : kpis.avancePct >= 100 ? 'green' : kpis.avancePct >= 80 ? 'blue' : kpis.avancePct >= 60 ? 'amber' : 'red'}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Líneas operando" value={`${kpis.lineasOperando} / ${kpis.lineasTotal}`} icon={<PrecisionManufacturingIcon />} accent="cyan" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Mayor producción" value={kpis.lineaTop?.name || '—'} subtitle={kpis.lineaTop ? `${kpis.lineaTop.production.toLocaleString('es-MX')} piezas` : ''} icon={<EmojiEventsIcon />} accent="purple" />
        </Grid>
      </Grid>

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

      {/* Plano de areas — diseño inspirado en el layout real del Excel */}
      <Typography sx={{ ...ps.sectionTitle, mb: 1.5 }}>Áreas de producción</Typography>
      <Box sx={{ mb: 3 }}>
        <AreasLayoutView onOpenLine={onOpenLine} />
      </Box>

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
