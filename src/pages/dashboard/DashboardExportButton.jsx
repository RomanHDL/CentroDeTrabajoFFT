import Button from '@mui/material/Button'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { workCenterById } from '../../data/production/catalog'
import { getMovementsForDate, getAttendanceForDate, getEmployeeById } from '../../data/personnel/repository'

/* Export de Excel EXCLUSIVO del Dashboard rediseñado (2026-08-25) --
   distinto a ExportMenuButton.jsx (ese sigue existiendo tal cual, sigue
   siendo de "Producción", no se toca). Este boton exporta un resumen
   real del propio Dashboard (Parte 57 del prompt): Resumen, Cobertura
   por área, Movimientos y Asistencia -- solo datos ya calculados por
   useDashboardMetrics(), nunca una segunda fuente. Autofilter en cada
   hoja (soportado por la libreria xlsx instalada); freeze panes y
   negritas de encabezado NO se incluyen porque la edicion community de
   SheetJS (unica instalada, sin costo) no los soporta al escribir un
   archivo -- se documenta aqui en vez de fingir que se aplicaron. */

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
  function handleExport() {
    const dateISO = dayjs().format('YYYY-MM-DD')
    const wb = XLSX.utils.book_new()

    const resumenWs = buildSheet([
      { metrica: 'Personal actual', valor: metrics.kpis.personalActual },
      { metrica: 'Plantilla ideal', valor: metrics.kpis.personalIdeal },
      { metrica: 'Personal faltante', valor: metrics.kpis.personalFaltante },
      { metrica: 'Cobertura general (%)', valor: metrics.kpis.coveragePct ?? '' },
      { metrica: 'Líneas operando', valor: `${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}` },
      { metrica: 'Movimientos hoy', valor: metrics.movementsToday },
      { metrica: 'Movimientos pendientes de aprobación', valor: metrics.pendingMovesCount },
    ], [
      { key: 'metrica', header: 'Métrica', width: 32 },
      { key: 'valor', header: 'Valor', width: 16 },
    ])
    XLSX.utils.book_append_sheet(wb, resumenWs, 'Resumen')

    const coberturaWs = buildSheet(
      metrics.areas.map((a) => ({
        area: a.name, actual: a.actual, ideal: a.ideal ?? '', faltante: a.missing ?? '',
        cobertura: a.coveragePct != null ? `${a.coveragePct}%` : '', estado: a.status || 'Sin plantilla',
      })),
      [
        { key: 'area', header: 'Área', width: 28 },
        { key: 'actual', header: 'Actual', width: 10 },
        { key: 'ideal', header: 'Ideal', width: 10 },
        { key: 'faltante', header: 'Faltante', width: 10 },
        { key: 'cobertura', header: 'Cobertura', width: 12 },
        { key: 'estado', header: 'Estado', width: 16 },
      ],
    )
    XLSX.utils.book_append_sheet(wb, coberturaWs, 'Cobertura por área')

    const movements = getMovementsForDate(dateISO)
    if (movements.length > 0) {
      const movWs = buildSheet(
        movements.map((m) => ({
          hora: m.movedAt || '',
          empleado: getEmployeeById(m.employeeId)?.name || m.employeeNumber || '',
          tipo: m.type === 'CHECK_IN' ? 'Registro' : m.type === 'RELEASE' ? 'Liberación' : 'Movimiento',
          desde: m.fromAreaId ? (workCenterById(m.fromAreaId)?.name || m.fromAreaId) : '',
          hacia: m.toAreaId ? (workCenterById(m.toAreaId)?.name || m.toAreaId) : '',
        })),
        [
          { key: 'hora', header: 'Hora', width: 10 },
          { key: 'empleado', header: 'Empleado', width: 30 },
          { key: 'tipo', header: 'Tipo', width: 14 },
          { key: 'desde', header: 'Desde', width: 24 },
          { key: 'hacia', header: 'Hacia', width: 24 },
        ],
      )
      XLSX.utils.book_append_sheet(wb, movWs, 'Movimientos')
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
          { key: 'empleado', header: 'Empleado', width: 30 },
          { key: 'numero', header: 'No. empleado', width: 14 },
          { key: 'hora', header: 'Hora de entrada', width: 16 },
          { key: 'turno', header: 'Turno', width: 14 },
        ],
      )
      XLSX.utils.book_append_sheet(wb, attWs, 'Asistencia')
    }

    XLSX.writeFile(wb, `Dashboard_${dateISO}.xlsx`)
  }

  return (
    <Button
      variant="contained" startIcon={<FileDownloadIcon />} onClick={handleExport}
      sx={{ height: 40, borderRadius: 2, fontWeight: 600, textTransform: 'none', px: 2.5, flexShrink: 0 }}
    >
      Descargar Excel
    </Button>
  )
}
