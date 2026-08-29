import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import { WORK_CENTERS, CURRENT_SHIFT, workCenterById } from './catalog'
import { hourlySeriesFor, weeklyProductionFor, weeklyTotals } from './production'
import { allLineSummaries, generalKpis } from './selectors'
import {
  getTodayRoster, getMovementsForEmployee, getMovementsForDate, getAverageHeadcountForArea, todayISO,
  getAllEmployees,
} from '../personnel/repository'
import { isEmployeeEligible } from '../personnel/directory'
import { getEffectiveAreaForEmployee } from './personnelByArea'

/* Genera archivos .xlsx reales (SheetJS/xlsx) con encabezados,
   anchos de columna y formato numerico/porcentaje real — nunca
   CSV disfrazado. */

function buildSheet(rows, columns) {
  const header = columns.map(c => c.header)
  const body = rows.map(row => columns.map(col => row[col.key]))
  const ws = XLSX.utils.aoa_to_sheet([header, ...body], { cellDates: true })
  ws['!cols'] = columns.map(c => ({ wch: c.width || 16 }))

  const lastRow = body.length
  columns.forEach((col, colIdx) => {
    if (!col.numFmt) return
    for (let r = 1; r <= lastRow; r += 1) {
      const addr = XLSX.utils.encode_cell({ r, c: colIdx })
      if (ws[addr]) ws[addr].z = col.numFmt
    }
  })
  return ws
}

function isoWeekNumber(d) {
  const date = new Date(Date.UTC(d.year(), d.month(), d.date()))
  const dayNum = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const diff = date - firstThursday
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

function mondayOf(dateISO) {
  const d = dayjs(dateISO)
  const isoDay = d.day() // 0=Dom..6=Sab
  const back = isoDay === 0 ? 6 : isoDay - 1
  return d.subtract(back, 'day')
}

/* ── Hojas reutilizables ── */

function sheetResumenDiario(dateISO) {
  const kpis = generalKpis()
  return buildSheet([{
    fecha: dayjs(dateISO).toDate(),
    turno: CURRENT_SHIFT,
    produccion: kpis.produccionHoy,
    meta: kpis.metaDia,
    cumplimiento: kpis.avancePct,
    personal: kpis.personalActivo,
  }], [
    { key: 'fecha', header: 'Fecha', width: 14, numFmt: 'dd/mm/yyyy' },
    { key: 'turno', header: 'Turno', width: 14 },
    { key: 'produccion', header: 'Producción total', width: 16, numFmt: '#,##0' },
    { key: 'meta', header: 'Meta', width: 12, numFmt: '#,##0' },
    { key: 'cumplimiento', header: 'Cumplimiento', width: 14, numFmt: '0"%"' },
    { key: 'personal', header: 'Personal activo', width: 16, numFmt: '#,##0' },
  ])
}

function sheetProduccionPorLinea() {
  const rows = allLineSummaries().map(r => ({
    linea: r.name,
    personal: r.personnel,
    produccion: r.production,
    meta: r.target,
    cumplimiento: r.pct ?? 0,
    estado: r.status.label,
  }))
  return buildSheet(rows, [
    { key: 'linea', header: 'Línea', width: 16 },
    { key: 'personal', header: 'Personal', width: 12, numFmt: '#,##0' },
    { key: 'produccion', header: 'Producción', width: 14, numFmt: '#,##0' },
    { key: 'meta', header: 'Meta', width: 12, numFmt: '#,##0' },
    { key: 'cumplimiento', header: 'Cumplimiento', width: 14, numFmt: '0"%"' },
    { key: 'estado', header: 'Estado', width: 16 },
  ])
}

function sheetProduccionPorHora() {
  const rows = []
  WORK_CENTERS.forEach((wc) => {
    hourlySeriesFor(wc.id).forEach((h) => {
      rows.push({ hora: h.hour, linea: wc.name, produccion: h.quantity })
    })
  })
  return buildSheet(rows, [
    { key: 'hora', header: 'Hora', width: 10 },
    { key: 'linea', header: 'Línea', width: 16 },
    { key: 'produccion', header: 'Producción', width: 14, numFmt: '#,##0' },
  ])
}

/* Hoja "Personal" — pase de lista real del dia (asignaciones
   + movimientos del modulo de Personal), ya no datos mock. */
function sheetPersonal(dateISO = todayISO()) {
  const roster = getTodayRoster(dateISO)
  const rows = roster.map((r) => {
    const movements = getMovementsForEmployee(r.employeeId, dateISO)
    const checkIn = movements.find(m => m.type === 'CHECK_IN')
    const moveCount = movements.filter(m => m.type === 'MOVE').length
    return {
      numero: r.employeeNumber,
      nombre: r.employee?.name || '',
      fecha: dayjs(dateISO).toDate(),
      turno: r.shift,
      areaInicial: workCenterById(checkIn?.toAreaId || r.areaId)?.name || '',
      rolInicial: checkIn?.toStationId || r.stationId,
      horaEntrada: r.checkInAt,
      areaActual: workCenterById(r.areaId)?.name || '',
      rolActual: r.stationId,
      movimientos: moveCount,
      estado: r.status,
    }
  })
  return buildSheet(rows, [
    { key: 'numero', header: 'Número empleado', width: 18 },
    { key: 'nombre', header: 'Nombre', width: 24 },
    { key: 'fecha', header: 'Fecha', width: 14, numFmt: 'dd/mm/yyyy' },
    { key: 'turno', header: 'Turno', width: 12 },
    { key: 'areaInicial', header: 'Área inicial', width: 16 },
    { key: 'rolInicial', header: 'Rol inicial', width: 20 },
    { key: 'horaEntrada', header: 'Hora entrada', width: 12 },
    { key: 'areaActual', header: 'Área actual', width: 16 },
    { key: 'rolActual', header: 'Rol actual', width: 20 },
    { key: 'movimientos', header: 'Cantidad de movimientos', width: 20, numFmt: '#,##0' },
    { key: 'estado', header: 'Estado', width: 14 },
  ])
}

/* Hoja "Movimientos" — historial append-only del dia, solo
   movimientos reales (no incluye la entrada inicial, ya
   cubierta en la hoja Personal). */
function sheetMovimientos(dateISO = todayISO()) {
  const rows = getMovementsForDate(dateISO)
    .filter(m => m.type === 'MOVE')
    .map((m) => {
      const roster = getTodayRoster(dateISO).find(r => r.employeeId === m.employeeId)
      return {
        numero: m.employeeNumber,
        nombre: roster?.employee?.name || '',
        origen: workCenterById(m.fromAreaId)?.name || '',
        rolOrigen: m.fromStationId || '',
        destino: workCenterById(m.toAreaId)?.name || '',
        rolDestino: m.toStationId || '',
        hora: m.movedAt,
        fecha: dayjs(m.date).toDate(),
        turno: m.shift,
      }
    })
  return buildSheet(rows, [
    { key: 'numero', header: 'Empleado', width: 14 },
    { key: 'nombre', header: 'Nombre', width: 24 },
    { key: 'origen', header: 'Origen', width: 16 },
    { key: 'rolOrigen', header: 'Rol origen', width: 20 },
    { key: 'destino', header: 'Destino', width: 16 },
    { key: 'rolDestino', header: 'Rol destino', width: 20 },
    { key: 'hora', header: 'Hora', width: 10 },
    { key: 'fecha', header: 'Fecha', width: 14, numFmt: 'dd/mm/yyyy' },
    { key: 'turno', header: 'Turno', width: 12 },
  ])
}

function sheetResumenSemanal(weekStart) {
  const totals = weeklyTotals()
  const production = totals.reduce((s, r) => s + r.production, 0)
  const target = totals.reduce((s, r) => s + r.target, 0)
  return buildSheet([{
    semana: `${weekStart.format('DD/MM/YYYY')} — ${weekStart.add(4, 'day').format('DD/MM/YYYY')}`,
    produccion: production,
    meta: target,
    cumplimiento: target > 0 ? Math.round((production / target) * 100) : 0,
  }], [
    { key: 'semana', header: 'Semana', width: 26 },
    { key: 'produccion', header: 'Producción total', width: 18, numFmt: '#,##0' },
    { key: 'meta', header: 'Meta semanal', width: 16, numFmt: '#,##0' },
    { key: 'cumplimiento', header: 'Cumplimiento', width: 14, numFmt: '0"%"' },
  ])
}

function sheetProduccionPorDia(weekStart) {
  const totals = weeklyTotals()
  const rows = totals.map((row, idx) => ({
    fecha: weekStart.add(idx, 'day').toDate(),
    produccion: row.production,
    meta: row.target,
    porcentaje: row.cumplimiento,
  }))
  return buildSheet(rows, [
    { key: 'fecha', header: 'Fecha', width: 14, numFmt: 'dd/mm/yyyy' },
    { key: 'produccion', header: 'Producción', width: 14, numFmt: '#,##0' },
    { key: 'meta', header: 'Meta', width: 12, numFmt: '#,##0' },
    { key: 'porcentaje', header: 'Porcentaje', width: 14, numFmt: '0"%"' },
  ])
}

function sheetProduccionPorLineaSemanal() {
  const rows = WORK_CENTERS.map((wc) => {
    const week = weeklyProductionFor(wc.id)
    const total = week.reduce((s, d) => s + d.production, 0)
    const byDay = {}
    week.forEach((d) => { byDay[d.day] = d.production })
    return {
      linea: wc.name,
      lunes: byDay['Lunes'] || 0,
      martes: byDay['Martes'] || 0,
      miercoles: byDay['Miércoles'] || 0,
      jueves: byDay['Jueves'] || 0,
      viernes: byDay['Viernes'] || 0,
      total,
    }
  })
  return buildSheet(rows, [
    { key: 'linea', header: 'Línea', width: 16 },
    { key: 'lunes', header: 'Lunes', width: 12, numFmt: '#,##0' },
    { key: 'martes', header: 'Martes', width: 12, numFmt: '#,##0' },
    { key: 'miercoles', header: 'Miércoles', width: 12, numFmt: '#,##0' },
    { key: 'jueves', header: 'Jueves', width: 12, numFmt: '#,##0' },
    { key: 'viernes', header: 'Viernes', width: 12, numFmt: '#,##0' },
    { key: 'total', header: 'Total', width: 14, numFmt: '#,##0' },
  ])
}

function sheetPersonalSemanal() {
  const rows = WORK_CENTERS.map((wc) => {
    const week = weeklyProductionFor(wc.id)
    const total = week.reduce((s, d) => s + d.production, 0)
    const promedioPersonal = getAverageHeadcountForArea(wc.id)
    return {
      linea: wc.name,
      promedioPersonal,
      produccion: total,
      productividad: promedioPersonal > 0 ? Math.round((total / promedioPersonal) * 10) / 10 : 0,
    }
  })
  return buildSheet(rows, [
    { key: 'linea', header: 'Línea', width: 16 },
    { key: 'promedioPersonal', header: 'Cantidad promedio de empleados', width: 26, numFmt: '#,##0.0' },
    { key: 'produccion', header: 'Producción', width: 14, numFmt: '#,##0' },
    { key: 'productividad', header: 'Productividad', width: 16, numFmt: '#,##0.0' },
  ])
}

// 'PENDIENTE' (BASE/SEM34 no confirmo numero real) y 'PROYECTO' (registrado sin numero desde
// Registro de Personal) no son numero de empleado real -- mismo criterio que PersonalDeHoyTab.jsx,
// no se duplica la logica, solo se repite la misma constante minima para no crear un import cruzado
// innecesario entre un modulo de UI y este archivo de exportacion.
const NO_REAL_NUMBER = new Set(['PENDIENTE', 'PROYECTO'])

/* Hoja "Directorio" — TODO el personal activo (elegible, sin bajas),
   persona por persona, igual fuente que el Directorio completo de la
   pestaña Personal (getAllEmployees + isEmployeeEligible). */
function sheetDirectorio() {
  const rows = getAllEmployees().filter(isEmployeeEligible).map((e) => ({
    numero: NO_REAL_NUMBER.has(e.employeeNumber) ? '' : e.employeeNumber,
    nombre: e.name,
    areaActual: workCenterById(getEffectiveAreaForEmployee(e.id))?.name || '',
    fechaIngreso: e.fechaIngreso || '',
    tipo: NO_REAL_NUMBER.has(e.employeeNumber) ? 'Proyecto / sin número confirmado' : 'Con número de empleado',
  }))
  return buildSheet(rows, [
    { key: 'numero', header: 'Número empleado', width: 18 },
    { key: 'nombre', header: 'Nombre', width: 28 },
    { key: 'areaActual', header: 'Área actual', width: 20 },
    { key: 'fechaIngreso', header: 'Fecha de ingreso', width: 16 },
    { key: 'tipo', header: 'Tipo', width: 26 },
  ])
}

/* ── Exports publicos ── */

/* Export dedicado del modulo "Centro de Trabajo > Personal" (2026-08-25,
   a peticion explicita del usuario) -- reutiliza exactamente las mismas
   hojas ya usadas en exportDailyExcel/exportCompleteExcel (sheetPersonal,
   sheetMovimientos), sin datos de produccion (eso vive en los otros
   exports, ExportMenuButton en Dashboard), mas una hoja nueva de
   Directorio completo (antes no se exportaba en ningun lado). */
export function exportPersonalExcel(dateISO = dayjs().format('YYYY-MM-DD')) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetPersonal(dateISO), 'Personal')
  XLSX.utils.book_append_sheet(wb, sheetMovimientos(dateISO), 'Movimientos')
  XLSX.utils.book_append_sheet(wb, sheetDirectorio(), 'Directorio')
  XLSX.writeFile(wb, `Personal_${dateISO}.xlsx`)
}

export function exportDailyExcel(dateISO = dayjs().format('YYYY-MM-DD')) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetResumenDiario(dateISO), 'Resumen')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorLinea(), 'Producción por línea')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorHora(), 'Producción por hora')
  XLSX.utils.book_append_sheet(wb, sheetPersonal(dateISO), 'Personal')
  XLSX.utils.book_append_sheet(wb, sheetMovimientos(dateISO), 'Movimientos')
  XLSX.writeFile(wb, `Produccion_${dateISO}.xlsx`)
}

export function exportWeeklyExcel(referenceDateISO = dayjs().format('YYYY-MM-DD')) {
  const weekStart = mondayOf(referenceDateISO)
  const week = isoWeekNumber(weekStart)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetResumenSemanal(weekStart), 'Resumen semanal')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorDia(weekStart), 'Producción por día')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorLineaSemanal(), 'Producción por línea')
  XLSX.utils.book_append_sheet(wb, sheetPersonalSemanal(), 'Personal')
  XLSX.writeFile(wb, `Produccion_Semana_${week}_${weekStart.format('YYYY')}.xlsx`)
}

export function exportLineComparisonExcel() {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorLinea(), 'Producción por línea')
  XLSX.writeFile(wb, `Produccion_Por_Linea_${dayjs().format('YYYY-MM-DD')}.xlsx`)
}

export function exportCompleteExcel(referenceDateISO = dayjs().format('YYYY-MM-DD')) {
  const weekStart = mondayOf(referenceDateISO)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetResumenDiario(referenceDateISO), 'Resumen día')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorLinea(), 'Producción por línea (día)')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorHora(), 'Producción por hora')
  XLSX.utils.book_append_sheet(wb, sheetResumenSemanal(weekStart), 'Resumen semana')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorDia(weekStart), 'Producción por día (semana)')
  XLSX.utils.book_append_sheet(wb, sheetProduccionPorLineaSemanal(), 'Producción por línea (semana)')
  XLSX.utils.book_append_sheet(wb, sheetPersonal(referenceDateISO), 'Personal')
  XLSX.utils.book_append_sheet(wb, sheetMovimientos(referenceDateISO), 'Movimientos')
  XLSX.writeFile(wb, `Produccion_Completa_${referenceDateISO}.xlsx`)
}
