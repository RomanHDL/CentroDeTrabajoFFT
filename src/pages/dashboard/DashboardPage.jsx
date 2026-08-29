import dayjs from 'dayjs'
import { Cog, RefreshCw, Shield, Sun, Target, Users, UserX } from 'lucide-react'
import {
  cardClass,
  metricChipClass,
  pageClass,
  pageSubtitleClass,
  pageTitleClass,
} from '@/lib/pageStyles'
import { useDashboardMetrics } from '../../data/dashboard/useDashboardMetrics'
import { getCurrentShift } from '../../data/production/catalog'
import AreaStatusDonutCard from './charts/AreaStatusDonutCard'
import CoverageDonutCard from './charts/CoverageDonutCard'
import MissingVsIdealComboCard from './charts/MissingVsIdealComboCard'
import ShiftDistributionDonutCard from './charts/ShiftDistributionDonutCard'
import DailyMovementsSummaryCard from './DailyMovementsSummaryCard'
import DashboardExecKpiCard from './DashboardExecKpiCard'
import DashboardExportButton from './DashboardExportButton'
import DashboardQuickSummaryStrip from './DashboardQuickSummaryStrip'
import FftIndicatorsCard from './FftIndicatorsCard'
import FindingsCard from './FindingsCard'
import RecentActivityCard from './RecentActivityCard'

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
   tarea.

   Fase 6c (MI Stack Reference): portado de MUI (Grid/Paper/Chip) a
   Tailwind -- el Grid de 5 columnas fraccionarias (md={2.4}) se traduce
   a grid-cols-5 real (2.4/12 = 1/5 exacto); la fila 2/3 (md=6/6/12,
   lg=4/4/4) se traduce a md:grid-cols-2 + md:col-span-2 en el tercer
   item para reproducir el mismo wrap. Iconos MUI -> Lucide (Cog
   reemplaza PrecisionManufacturingIcon, ya consistente con el resto de
   Fase 6). */
export default function DashboardPage() {
  const metrics = useDashboardMetrics()
  const today = dayjs()
  const currentShift = getCurrentShift()

  return (
    <div className={pageClass}>
      {/* Header */}
      <div className={`${cardClass} mb-4`}>
        <div className="flex flex-col items-start gap-3 border-b border-border bg-black/[.015] px-5 py-3.5 dark:bg-white/[.02] md:flex-row md:items-center">
          <div className="flex-1">
            <p className={pageTitleClass}>Dashboard</p>
            <p className={pageSubtitleClass}>Resumen general del centro de trabajo</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={metricChipClass('info')}>
              <Sun className="mr-1 h-4 w-4" />
              {`Turno: ${currentShift.label}`}
            </span>
            <span
              className={metricChipClass('default')}
            >{`Hoy: ${today.format('DD MMMM YYYY')}`}</span>
            <DashboardExportButton metrics={metrics} />
          </div>
        </div>
      </div>

      {/* Fila 1 -- 5 KPIs ejecutivos, ORDEN EXACTO pedido 2026-08-26:
          Personal actual, Personal faltante, Plantilla ideal, Líneas
          operando, Cobertura total (antes: Plantilla ideal primero). */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        <DashboardExecKpiCard
          icon={<Users />}
          accent="#3B82F6"
          title="Personal actual"
          value={metrics.kpis.personalActual}
          unit="personas en turno"
          footerLabel="Ideal"
          footerValue={metrics.kpis.personalIdeal}
        />
        <DashboardExecKpiCard
          icon={<UserX />}
          accent="#EF4444"
          title="Personal faltante"
          value={metrics.kpis.personalFaltante}
          unit="personas faltantes"
          footerLabel={
            metrics.kpis.faltantePct != null
              ? `${metrics.kpis.faltantePct}% del ideal`
              : 'Sin plantilla ideal'
          }
        />
        <DashboardExecKpiCard
          icon={<Target />}
          accent="#A855F7"
          title="Plantilla ideal"
          value={metrics.kpis.personalIdeal}
          unit="personas"
          footerLabel="Total ideal definida"
        />
        <DashboardExecKpiCard
          icon={<Cog />}
          accent="#06B6D4"
          title="Líneas operando"
          value={`${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}`}
          unit="líneas operativas"
          footerLabel={
            metrics.kpis.lineasTotal > 0
              ? `${Math.round((metrics.kpis.lineasOperando / metrics.kpis.lineasTotal) * 100)}% de las líneas`
              : ''
          }
        />
        <DashboardExecKpiCard
          icon={<Shield />}
          accent="#10B981"
          title="Cobertura total"
          value={metrics.kpis.coveragePct != null ? `${metrics.kpis.coveragePct}%` : '—'}
          unit="de cobertura general"
          progressPct={metrics.kpis.coverageBarPct}
          footerLabel={`${metrics.totals.realTotal} / ${metrics.totals.idealTotal} del ideal`}
        />
      </div>

      {/* Fila 2 -- Cobertura por área | Faltante vs ideal por área | Estado de las áreas */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CoverageDonutCard areas={metrics.areas} coveragePct={metrics.kpis.coveragePct} />
        <MissingVsIdealComboCard areas={metrics.areas} />
        <div className="md:col-span-2 lg:col-span-1">
          <AreaStatusDonutCard statusCounts={metrics.statusCounts} />
        </div>
      </div>

      {/* Fila 3 -- Distribución por turno | Movimientos del día | Actividades recientes */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ShiftDistributionDonutCard shifts={metrics.shifts} />
        <DailyMovementsSummaryCard dailyMovements={metrics.dailyMovements} />
        <div className="md:col-span-2 lg:col-span-1">
          <RecentActivityCard recentActivity={metrics.recentActivity} />
        </div>
      </div>

      {/* Fila 4 -- Hallazgos del día | Indicadores FFT */}
      <div className="mb-3 grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-7">
          <FindingsCard findings={metrics.findings} />
        </div>
        <div className="md:col-span-5">
          <FftIndicatorsCard />
        </div>
      </div>

      {/* Resumen rápido del centro de trabajo -- franja compacta final */}
      <DashboardQuickSummaryStrip metrics={metrics} />

      {/* Ultima actualizacion -- discreto, nunca una card grande */}
      <div className="mt-3 flex items-center justify-end gap-1 opacity-65">
        <RefreshCw className="h-[13px] w-[13px]" />
        <p className="text-[11px]">Última actualización: {metrics.updatedAt.format('hh:mm A')}</p>
      </div>
    </div>
  )
}
