import dayjs from 'dayjs'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import {
  getAttendanceForDate,
  getEmployeeById,
  getMovementsForDate,
} from '../../data/personnel/repository'
import { workCenterById } from '../../data/production/catalog'

/* Export de Excel EXCLUSIVO del Dashboard rediseñado (2026-08-25,
   hoja Turnos agregada 2026-08-26 a peticion explicita del usuario) --
   distinto a ExportMenuButton.jsx (ese sigue existiendo tal cual, sigue
   siendo de "Producción", no se toca). Este boton exporta un resumen
   real del propio Dashboard: Resumen, Áreas, Movimientos, Turnos y
   Asistencia -- solo datos ya calculados por useDashboardMetrics(),
   nunca una segunda fuente. Autofilter en cada hoja (soportado por la
   libreria xlsx instalada); freeze panes y negritas de encabezado NO se
   incluyen porque la edicion community de SheetJS (unica instalada, sin
   costo) no los soporta al escribir un archivo -- se documenta aqui en
   vez de fingir que se aplicaron. */

function buildSheet(rows, columns) {
  const header = columns.map((c) => c.header)
  const body = rows.map((row) => columns.map((c) => row[c.key]))
  const ws = XLSX.utils.aoa_to_sheet([header, ...body])
  ws['!cols'] = columns.map((c) => ({ wch: c.width || 18 }))
  if (body.length > 0) {
    const lastCol = XLSX.utils.encode_col(columns.length - 1)
    ws['!autofilter'] = { ref: `A1:${lastCol}1` }
  }
  return ws
}

export default function DashboardExportButton({ metrics }) {
  const { t } = useTranslation('dashboard')

  function handleExport() {
    const dateISO = dayjs().format('YYYY-MM-DD')
    const wb = XLSX.utils.book_new()

    const resumenWs = buildSheet(
      [
        {
          metrica: t('dashboardExportButton.metricPersonalActual'),
          valor: metrics.kpis.personalActual,
        },
        {
          metrica: t('dashboardExportButton.metricPlantillaIdeal'),
          valor: metrics.kpis.personalIdeal,
        },
        {
          metrica: t('dashboardExportButton.metricPersonalFaltante'),
          valor: metrics.kpis.personalFaltante,
        },
        {
          metrica: t('dashboardExportButton.metricCoberturaGeneral'),
          valor: metrics.kpis.coveragePct ?? '',
        },
        {
          metrica: t('dashboardExportButton.metricLineasOperando'),
          valor: `${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}`,
        },
        { metrica: t('dashboardExportButton.metricMovimientosHoy'), valor: metrics.movementsToday },
        {
          metrica: t('dashboardExportButton.metricMovimientosPendientes'),
          valor: metrics.pendingMovesCount,
        },
      ],
      [
        { key: 'metrica', header: t('dashboardExportButton.metricColumnHeader'), width: 32 },
        { key: 'valor', header: t('dashboardExportButton.valueColumnHeader'), width: 16 },
      ],
    )
    XLSX.utils.book_append_sheet(wb, resumenWs, t('dashboardExportButton.summarySheetName'))

    const coberturaWs = buildSheet(
      metrics.areas.map((a) => ({
        area: a.name,
        actual: a.actual,
        ideal: a.ideal ?? '',
        faltante: a.missing ?? '',
        cobertura: a.coveragePct != null ? `${a.coveragePct}%` : '',
        estado: a.status || t('dashboardExportButton.noTemplateStatus'),
      })),
      [
        { key: 'area', header: t('dashboardExportButton.areaColumnHeader'), width: 28 },
        { key: 'actual', header: t('dashboardExportButton.actualColumnHeader'), width: 10 },
        { key: 'ideal', header: t('dashboardExportButton.idealColumnHeader'), width: 10 },
        { key: 'faltante', header: t('dashboardExportButton.faltanteColumnHeader'), width: 10 },
        { key: 'cobertura', header: t('dashboardExportButton.coberturaColumnHeader'), width: 12 },
        { key: 'estado', header: t('dashboardExportButton.estadoColumnHeader'), width: 16 },
      ],
    )
    XLSX.utils.book_append_sheet(wb, coberturaWs, t('dashboardExportButton.areasSheetName'))

    const turnosWs = buildSheet(
      metrics.shifts.map((s) => ({ turno: s.label, personas: s.count })),
      [
        { key: 'turno', header: t('dashboardExportButton.turnoColumnHeader'), width: 24 },
        { key: 'personas', header: t('dashboardExportButton.personasColumnHeader'), width: 12 },
      ],
    )
    XLSX.utils.book_append_sheet(wb, turnosWs, t('dashboardExportButton.shiftsSheetName'))

    const movements = getMovementsForDate(dateISO)
    if (movements.length > 0) {
      const movWs = buildSheet(
        movements.map((m) => ({
          hora: m.movedAt || '',
          empleado: getEmployeeById(m.employeeId)?.name || m.employeeNumber || '',
          tipo:
            m.type === 'CHECK_IN'
              ? t('dashboardExportButton.movementTypeCheckIn')
              : m.type === 'RELEASE'
                ? t('dashboardExportButton.movementTypeRelease')
                : t('dashboardExportButton.movementTypeMovement'),
          desde: m.fromAreaId ? workCenterById(m.fromAreaId)?.name || m.fromAreaId : '',
          hacia: m.toAreaId ? workCenterById(m.toAreaId)?.name || m.toAreaId : '',
        })),
        [
          { key: 'hora', header: t('dashboardExportButton.horaColumnHeader'), width: 10 },
          { key: 'empleado', header: t('dashboardExportButton.empleadoColumnHeader'), width: 30 },
          { key: 'tipo', header: t('dashboardExportButton.tipoColumnHeader'), width: 14 },
          { key: 'desde', header: t('dashboardExportButton.desdeColumnHeader'), width: 24 },
          { key: 'hacia', header: t('dashboardExportButton.haciaColumnHeader'), width: 24 },
        ],
      )
      XLSX.utils.book_append_sheet(wb, movWs, t('dashboardExportButton.movementsSheetName'))
    }

    const attendance = getAttendanceForDate(dateISO)
    if (attendance.length > 0) {
      const attWs = buildSheet(
        attendance.map((a) => ({
          empleado: getEmployeeById(a.employeeId)?.name || a.employeeNumber || '',
          numero: a.employeeNumber || '',
          hora: a.checkedInAt || '',
          turno: a.shift || '',
        })),
        [
          { key: 'empleado', header: t('dashboardExportButton.empleadoColumnHeader'), width: 30 },
          {
            key: 'numero',
            header: t('dashboardExportButton.employeeNumberColumnHeader'),
            width: 14,
          },
          { key: 'hora', header: t('dashboardExportButton.checkInTimeColumnHeader'), width: 16 },
          { key: 'turno', header: t('dashboardExportButton.turnoColumnHeader'), width: 14 },
        ],
      )
      XLSX.utils.book_append_sheet(wb, attWs, t('dashboardExportButton.attendanceSheetName'))
    }

    XLSX.writeFile(wb, `Dashboard_${dateISO}.xlsx`)
  }

  return (
    // Fase 6c: h-40px = h-10, borderRadius 2 * theme.shape.borderRadius(10) = 20px, px 2.5*8 = 20px = px-5
    <Button
      onClick={handleExport}
      className="h-10 shrink-0 rounded-[20px] px-5 font-semibold normal-case"
    >
      <Download className="h-4 w-4" />
      {t('dashboardExportButton.buttonLabel')}
    </Button>
  )
}
