import dayjs from 'dayjs'
import ExcelJS from 'exceljs'

/* Exportacion a Excel del modulo Asistencia (2026-09-14, a peticion explicita del usuario --
   "reporte profesional de asistencia utilizando los datos reales que ya tiene el sistema...
   NO inventar informacion"). Mismo criterio y libreria ya probados en
   src/data/demoras/exportExcel.js (unica referencia real de "Excel profesional" en el repo,
   revisada antes de escribir este archivo):

   - `exceljs` (no `xlsx`/SheetJS) por los mismos motivos ya documentados ahi: es la unica de
     las 2 librerias ya instaladas que escribe estilos reales (fill/color/bordes/negritas/zebra
     striping) al generar el archivo.
   - Sin graficas nativas de Excel: NINGUNA libreria de Excel sin costo (ni xlsx ni exceljs)
     escribe graficas nativas/editables ("chart parts" del formato xlsx) -- se investigo esto
     de nuevo para esta tarea, misma conclusion que en demoras. Las 3 graficas pedidas (dona +
     2 de barras) se dibujan en un <canvas> nativo del navegador (sin libreria nueva) y se
     incrustan como imagenes PNG junto a tablas reales con los mismos numeros exactos -- se
     ve la grafica al abrir el archivo, pero es una imagen, no un objeto reconfigurable. Se
     documenta aqui, no se oculta al usuario (ver reporte final de la tarea).
   - Encabezados congelados: demoras/exportExcel.js NUNCA usa freeze panes por un bug real
     encontrado ahi (`views:[{state:'frozen', ySplit:N}]` SIN `topLeftCell` duplica
     visualmente el contenido en Excel real -- ver memoria del proyecto). Aqui SI se usan
     (pedido explicito: "congelar encabezado" en Detalle Personal), pero siempre con
     `topLeftCell` fijado exactamente al primer renglon de datos -- el fix real del bug, no
     solo evitarlo.

   Este modulo es puramente de PRESENTACION: no conoce catalogos, i18n de estados ni consulta
   nada -- recibe `rows` ya resueltas por AsistenciaPage.jsx (misma logica real que ya decide
   presente/pendiente/inasistencia/baja en pantalla, ver ese archivo) y `meta` (periodo/turno/
   area ya resueltos por el filtro vigente de la pagina). Nunca recalcula un estado de asistencia
   por su cuenta -- ver ATTENDANCE_STATUS_KEYS abajo, el set cerrado de estados que ya decidio
   quien arma `rows`. */

export const ATTENDANCE_STATUS_KEYS = [
  'ASISTENCIA',
  'RETARDO',
  'FALTA',
  'INCAPACIDAD',
  'VACACIONES',
  'BAJA',
  'SIN_REGISTRO',
]

// Paleta por estatus (2026-09-14, pedido explicito del usuario -- "colores consistentes, no
// exagerar, debe verse corporativo"): fondo claro + texto oscuro del mismo tono para que el
// texto siga siendo legible sobre el relleno (pedido explicito), nunca blanco sobre un color
// saturado. `accent` (mas saturado) se usa solo para el borde superior de las KPI cards.
const STATUS_STYLE = {
  ASISTENCIA: { bg: 'FFD1FAE5', text: 'FF065F46', accent: 'FF10B981' },
  RETARDO: { bg: 'FFFFEDD5', text: 'FF9A3412', accent: 'FFF97316' },
  FALTA: { bg: 'FFFEE2E2', text: 'FF991B1B', accent: 'FFEF4444' },
  INCAPACIDAD: { bg: 'FFDBEAFE', text: 'FF1E3A8A', accent: 'FF3B82F6' },
  VACACIONES: { bg: 'FFEDE9FE', text: 'FF5B21B6', accent: 'FF8B5CF6' },
  BAJA: { bg: 'FFE5E7EB', text: 'FF374151', accent: 'FF6B7280' },
  SIN_REGISTRO: { bg: 'FFF1F5F9', text: 'FF64748B', accent: 'FFCBD5E1' },
}
const TOTAL_STYLE = { bg: 'FF1E293B', text: 'FFFFFFFF', accent: 'FF1E293B' }

const COLOR_NAVY = 'FF1E293B' // encabezados principales ("azul marino", pedido explicito)
const COLOR_NAVY_HEX = '#1E293B'
const COLOR_PRIMARY = 'FF1D4ED8' // azul corporativo (brand primary, igual que demoras/exportExcel.js)
const COLOR_BAND = 'FFF8FAFC' // zebra striping muy suave (gris casi blanco, "no saturado")
const COLOR_WHITE = 'FFFFFFFF'

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
}

// 22 (no 16, como en demoras/exportExcel.js) -- esta hoja pone 3 imagenes lado a lado
// (dona + 2 graficas de barras) mas una leyenda de tabla real junto a la dona, y necesitan
// columnas propias sin encimarse (ver buildSummarySheet: columnas 1-4 dona, 6-9 leyenda,
// 11-15 grafica de area, 17-21 grafica de turno, con una columna de respiro entre cada bloque).
const FULL_WIDTH_COLS = 22

function styleHeaderCells(ws, rowNumber, colFrom, colTo, { navy = true } = {}) {
  for (let c = colFrom; c <= colTo; c += 1) {
    const cell = ws.getCell(rowNumber, c)
    cell.font = { bold: true, color: { argb: COLOR_WHITE } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: navy ? COLOR_NAVY : COLOR_PRIMARY },
    }
    cell.border = THIN_BORDER
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  }
  ws.getRow(rowNumber).height = 20
}

function styleDataRow(ws, rowNumber, colFrom, colTo, zebra) {
  for (let c = colFrom; c <= colTo; c += 1) {
    const cell = ws.getCell(rowNumber, c)
    cell.border = THIN_BORDER
    if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BAND } }
  }
}

function writeSectionTitle(ws, rowNumber, text) {
  const cell = ws.getCell(rowNumber, 1)
  cell.value = text
  cell.font = { bold: true, size: 12, color: { argb: COLOR_PRIMARY } }
  for (let c = 1; c <= FULL_WIDTH_COLS; c += 1) {
    ws.getCell(rowNumber, c).border = {
      bottom: { style: 'medium', color: { argb: COLOR_PRIMARY } },
    }
  }
  ws.getRow(rowNumber).height = 18
  return rowNumber + 2
}

// Fila de "cards" de KPI (2026-09-14, pedido explicito: "cards/celdas visuales grandes") --
// Excel no tiene tarjetas reales, se simulan con bloques de celdas combinadas de 2 columnas x 3
// filas (etiqueta / numero grande / porcentaje), coloreadas por estatus. 8 cards x 2 columnas =
// 16 columnas -- mas angosto que FULL_WIDTH_COLS (22, ver esa constante) a proposito: las 3
// graficas de abajo necesitan mas ancho que las cards, no hace falta que las cards lo llenen.
function writeKpiCards(ws, startRow, cards) {
  const cardWidth = 2
  let col = 1
  cards.forEach((card) => {
    const c0 = col
    const c1 = col + cardWidth - 1
    const style = card.style

    ws.mergeCells(startRow, c0, startRow, c1)
    const labelCell = ws.getCell(startRow, c0)
    labelCell.value = card.label
    labelCell.font = { bold: true, size: 8.5, color: { argb: style.text } }
    labelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

    ws.mergeCells(startRow + 1, c0, startRow + 1, c1)
    const valueCell = ws.getCell(startRow + 1, c0)
    valueCell.value = card.value
    valueCell.font = { bold: true, size: 20, color: { argb: style.text } }
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' }

    ws.mergeCells(startRow + 2, c0, startRow + 2, c1)
    const pctCell = ws.getCell(startRow + 2, c0)
    pctCell.value = card.pct
    pctCell.numFmt = '0.0%'
    pctCell.font = { size: 10, color: { argb: style.text } }
    pctCell.alignment = { horizontal: 'center', vertical: 'middle' }

    for (let r = startRow; r <= startRow + 2; r += 1) {
      for (let c = c0; c <= c1; c += 1) {
        const cell = ws.getCell(r, c)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } }
        cell.border = THIN_BORDER
      }
    }
    ws.getCell(startRow, c0).border = {
      ...THIN_BORDER,
      top: { style: 'medium', color: { argb: style.accent } },
    }
    ws.getCell(startRow, c1).border = {
      ...THIN_BORDER,
      top: { style: 'medium', color: { argb: style.accent } },
    }

    col += cardWidth
  })
  ws.getRow(startRow).height = 22
  ws.getRow(startRow + 1).height = 30
  ws.getRow(startRow + 2).height = 16
  return startRow + 4
}

function groupBy(rows, keyFn) {
  const map = new Map()
  for (const r of rows) {
    const key = keyFn(r)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return map
}

function countByStatus(rows) {
  const counts = Object.fromEntries(ATTENDANCE_STATUS_KEYS.map((k) => [k, 0]))
  rows.forEach((r) => {
    counts[r.statusKey] = (counts[r.statusKey] || 0) + 1
  })
  return counts
}

// ==================================================================== Graficas (canvas -> PNG)

function drawDonutChart(items, { totalLabel, total }) {
  const size = 300
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = size * scale
  canvas.height = size * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 12
  const innerR = outerR * 0.6
  const sum = items.reduce((s, i) => s + i.value, 0)

  let start = -Math.PI / 2
  if (sum > 0) {
    items.forEach((item) => {
      if (item.value <= 0) return
      const angle = (item.value / sum) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, outerR, start, start + angle)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()
      start += angle
    })
  } else {
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.fillStyle = '#E2E8F0'
    ctx.fill()
  }

  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.fillStyle = COLOR_NAVY_HEX
  ctx.textAlign = 'center'
  ctx.font = 'bold 28px Arial, sans-serif'
  ctx.fillText(String(total), cx, cy - 2)
  ctx.font = '11px Arial, sans-serif'
  ctx.fillStyle = '#64748B'
  ctx.fillText(totalLabel, cx, cy + 18)

  return canvas.toDataURL('image/png').split(',')[1]
}

function drawBarChart(items, { color = COLOR_NAVY_HEX, width = 460, height = 300 } = {}) {
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const padding = { top: 26, right: 16, bottom: 56, left: 16 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const maxValue = Math.max(1, ...items.map((i) => i.value))
  const barCount = Math.max(1, items.length)
  const barGap = 14
  const barWidth = (chartW - barGap * (barCount - 1)) / barCount

  items.forEach((item, i) => {
    const x = padding.left + i * (barWidth + barGap)
    const barH = (item.value / maxValue) * chartH
    const y = padding.top + chartH - barH
    ctx.fillStyle = color
    ctx.fillRect(x, y, barWidth, barH)

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 12px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(item.value), x + barWidth / 2, y - 6)

    ctx.save()
    ctx.translate(x + barWidth / 2, padding.top + chartH + 8)
    ctx.rotate(-Math.PI / 6)
    ctx.textAlign = 'right'
    ctx.font = '10px Arial, sans-serif'
    ctx.fillStyle = '#374151'
    const label = item.label.length > 20 ? `${item.label.slice(0, 19)}…` : item.label
    ctx.fillText(label, 0, 0)
    ctx.restore()
  })

  ctx.strokeStyle = '#CBD5E1'
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top + chartH)
  ctx.lineTo(padding.left + chartW, padding.top + chartH)
  ctx.stroke()

  return canvas.toDataURL('image/png').split(',')[1]
}

// ==================================================================== Hoja "RESUMEN ASISTENCIA"

function buildSummarySheet(workbook, { rows, meta, t }) {
  const ws = workbook.addWorksheet(t('export.sheetSummary'))
  ws.columns = Array.from({ length: FULL_WIDTH_COLS }, () => ({ width: 10 }))
  ws.getColumn(1).width = 26

  const total = rows.length
  const counts = countByStatus(rows)
  const pct = (n) => (total > 0 ? n / total : 0)

  // ---------------------------------------------------------------- Banner corporativo
  let row = 1
  ws.mergeCells(row, 1, row, FULL_WIDTH_COLS)
  const companyCell = ws.getCell(row, 1)
  companyCell.value = t('export.companyName')
  companyCell.font = { bold: true, size: 12, color: { argb: COLOR_WHITE } }
  companyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
  companyCell.alignment = { vertical: 'middle' }
  ws.getRow(row).height = 22
  row += 1

  ws.mergeCells(row, 1, row, FULL_WIDTH_COLS)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = `${t('export.reportTitle')} — ${t('export.reportSubtitle')}`
  titleCell.font = { bold: true, size: 15, color: { argb: COLOR_WHITE } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
  titleCell.alignment = { vertical: 'middle' }
  ws.getRow(row).height = 26
  row += 1

  ws.mergeCells(row, 1, row, FULL_WIDTH_COLS)
  const metaCell = ws.getCell(row, 1)
  metaCell.value = [
    t('export.periodLabel', { period: meta.periodLabel }),
    t('export.shiftLabel', { shift: meta.shiftLabel }),
    t('export.areaLabel', { area: meta.areaLabel }),
  ].join('     ')
  metaCell.font = { size: 10.5, color: { argb: COLOR_WHITE } }
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
  metaCell.alignment = { vertical: 'middle' }
  ws.getRow(row).height = 20
  row += 2

  // ---------------------------------------------------------------- KPIs
  const kpiCards = [
    {
      label: t('export.kpiAsistencia'),
      value: counts.ASISTENCIA,
      pct: pct(counts.ASISTENCIA),
      style: STATUS_STYLE.ASISTENCIA,
    },
    {
      label: t('export.kpiFalta'),
      value: counts.FALTA,
      pct: pct(counts.FALTA),
      style: STATUS_STYLE.FALTA,
    },
    {
      label: t('export.kpiRetardo'),
      value: counts.RETARDO,
      pct: pct(counts.RETARDO),
      style: STATUS_STYLE.RETARDO,
    },
    {
      label: t('export.kpiIncapacidad'),
      value: counts.INCAPACIDAD,
      pct: pct(counts.INCAPACIDAD),
      style: STATUS_STYLE.INCAPACIDAD,
    },
    {
      label: t('export.kpiVacaciones'),
      value: counts.VACACIONES,
      pct: pct(counts.VACACIONES),
      style: STATUS_STYLE.VACACIONES,
    },
    {
      label: t('export.kpiBaja'),
      value: counts.BAJA,
      pct: pct(counts.BAJA),
      style: STATUS_STYLE.BAJA,
    },
    {
      label: t('export.kpiSinRegistro'),
      value: counts.SIN_REGISTRO,
      pct: pct(counts.SIN_REGISTRO),
      style: STATUS_STYLE.SIN_REGISTRO,
    },
    { label: t('export.kpiTotal'), value: total, pct: 1, style: TOTAL_STYLE },
  ]
  row = writeKpiCards(ws, row, kpiCards)

  // ---------------------------------------------------------------- Graficas
  // Anclas de columna FIJAS y sin encimarse (0-indexado, como pide ws.addImage):
  //   dona:            columnas 1-4   (A-D)
  //   leyenda (tabla):  columnas 6-9   (F-I)
  //   grafica de area: columnas 11-15 (K-O)
  //   grafica de turno: columnas 17-21 (Q-U)
  // Una columna de respiro (E/J/P) entre cada bloque para que nunca se toquen.
  ws.getColumn(7).width = 20 // columna G: nombres de estatus en la leyenda, necesitan mas ancho
  const LEGEND_COL = 6 // F (1-indexado, para ws.getCell)
  const AREA_CHART_COL0 = 10 // K (0-indexado, para addImage)
  const SHIFT_CHART_COL0 = 16 // Q (0-indexado, para addImage)

  const chartTitleRow = row
  row = writeSectionTitle(ws, row, t('export.chartDistribution'))
  ws.mergeCells(chartTitleRow, AREA_CHART_COL0 + 1, chartTitleRow, AREA_CHART_COL0 + 5)
  ws.getCell(chartTitleRow, AREA_CHART_COL0 + 1).value = t('export.chartByArea')
  ws.getCell(chartTitleRow, AREA_CHART_COL0 + 1).font = {
    bold: true,
    size: 12,
    color: { argb: COLOR_PRIMARY },
  }
  ws.mergeCells(chartTitleRow, SHIFT_CHART_COL0 + 1, chartTitleRow, SHIFT_CHART_COL0 + 5)
  ws.getCell(chartTitleRow, SHIFT_CHART_COL0 + 1).value = t('export.chartByShift')
  ws.getCell(chartTitleRow, SHIFT_CHART_COL0 + 1).font = {
    bold: true,
    size: 12,
    color: { argb: COLOR_PRIMARY },
  }

  const donutItems = ATTENDANCE_STATUS_KEYS.map((key) => ({
    key,
    value: counts[key],
    color: `#${STATUS_STYLE[key].accent.slice(2)}`,
  }))
  const donutBase64 = drawDonutChart(donutItems, { totalLabel: t('export.kpiTotal'), total })
  const donutImageId = workbook.addImage({ base64: donutBase64, extension: 'png' })
  ws.addImage(donutImageId, {
    tl: { col: 0, row: row - 1 },
    ext: { width: 260, height: 260 },
  })

  // Leyenda real (cantidad + porcentaje) junto a la dona -- pedido explicito.
  let legendRow = row
  ATTENDANCE_STATUS_KEYS.forEach((key, idx) => {
    const swatch = ws.getCell(legendRow, LEGEND_COL)
    swatch.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_STYLE[key].accent } }
    swatch.border = THIN_BORDER
    ws.getCell(legendRow, LEGEND_COL + 1).value = t(`export.kpi${statusLabelKey(key)}`)
    ws.getCell(legendRow, LEGEND_COL + 2).value = counts[key]
    const legendPctCell = ws.getCell(legendRow, LEGEND_COL + 3)
    legendPctCell.value = pct(counts[key])
    legendPctCell.numFmt = '0.0%'
    styleDataRow(ws, legendRow, LEGEND_COL, LEGEND_COL + 3, idx % 2 === 1)
    legendRow += 1
  })

  const areaBreakdown = buildAreaBreakdown(rows)
  const areaChartItems = collapseTopN(areaBreakdown, 6, t('export.otherAreasLabel')).map((a) => ({
    label: a.area,
    value: a.counts.ASISTENCIA,
  }))
  const areaBase64 = drawBarChart(areaChartItems, { color: '#1D4ED8' })
  const areaImageId = workbook.addImage({ base64: areaBase64, extension: 'png' })
  ws.addImage(areaImageId, {
    tl: { col: AREA_CHART_COL0, row: row - 1 },
    ext: { width: 300, height: 260 },
  })

  const shiftBreakdown = buildShiftBreakdown(rows, t)
  const shiftChartItems = shiftBreakdown.map((s) => ({ label: s.shift, value: s.total }))
  const shiftBase64 = drawBarChart(shiftChartItems, { color: '#7C3AED' })
  const shiftImageId = workbook.addImage({ base64: shiftBase64, extension: 'png' })
  ws.addImage(shiftImageId, {
    tl: { col: SHIFT_CHART_COL0, row: row - 1 },
    ext: { width: 300, height: 260 },
  })

  row += 15

  // ---------------------------------------------------------------- Resumen por area
  row = writeBreakdownStatusTable(
    ws,
    row,
    t('export.summaryByArea'),
    t('export.colArea'),
    areaBreakdown.map((a) => [a.area, a.counts]),
    t,
  )

  // ---------------------------------------------------------------- Resumen por turno
  row = writeBreakdownStatusTable(
    ws,
    row,
    t('export.summaryByShift'),
    t('export.colShift'),
    shiftBreakdown.map((s) => [s.shift, s.counts]),
    t,
  )

  // ---------------------------------------------------------------- Resumen de estatus (con formula real)
  row = writeSectionTitle(ws, row, t('export.summaryByStatus'))
  const statusHeaderRow = row
  ws.getCell(statusHeaderRow, 1).value = t('export.colStatus')
  ws.getCell(statusHeaderRow, 2).value = t('export.colQuantity')
  ws.getCell(statusHeaderRow, 3).value = t('export.colPercentage')
  styleHeaderCells(ws, statusHeaderRow, 1, 3, { navy: false })
  let statusRow = statusHeaderRow + 1
  const totalRowNumber = statusHeaderRow + ATTENDANCE_STATUS_KEYS.length + 1
  ATTENDANCE_STATUS_KEYS.forEach((key, idx) => {
    ws.getCell(statusRow, 1).value = t(`export.kpi${statusLabelKey(key)}`)
    ws.getCell(statusRow, 2).value = counts[key]
    const pctCell = ws.getCell(statusRow, 3)
    pctCell.value = { formula: `=B${statusRow}/B${totalRowNumber}` }
    pctCell.numFmt = '0.0%'
    styleDataRow(ws, statusRow, 1, 3, idx % 2 === 1)
    const style = STATUS_STYLE[key]
    ws.getCell(statusRow, 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: style.bg },
    }
    ws.getCell(statusRow, 1).font = { color: { argb: style.text }, bold: true }
    statusRow += 1
  })
  ws.getCell(totalRowNumber, 1).value = t('export.totalGeneral')
  ws.getCell(totalRowNumber, 2).value = {
    formula: `=SUM(B${statusHeaderRow + 1}:B${totalRowNumber - 1})`,
  }
  const totalPctCell = ws.getCell(totalRowNumber, 3)
  totalPctCell.value = { formula: `=B${totalRowNumber}/B${totalRowNumber}` }
  totalPctCell.numFmt = '0.0%'
  styleHeaderCells(ws, totalRowNumber, 1, 3, { navy: false })
  row = totalRowNumber + 2

  // ---------------------------------------------------------------- Notas
  row = writeSectionTitle(ws, row, t('export.notesTitle'))
  ;[t('export.noteShiftAuto'), t('export.noteGenerated'), t('export.noteRealtime')].forEach(
    (note) => {
      ws.getCell(row, 1).value = `• ${note}`
      ws.mergeCells(row, 1, row, FULL_WIDTH_COLS)
      row += 1
    },
  )
  ws.getCell(row, 1).value = t('export.generatedAt', {
    date: dayjs().format('DD/MM/YYYY'),
    time: dayjs().format('HH:mm'),
  })
  ws.mergeCells(row, 1, row, FULL_WIDTH_COLS)
  ws.getCell(row, 1).font = { italic: true, size: 9, color: { argb: 'FF94A3B8' } }
}

function statusLabelKey(key) {
  return (
    {
      ASISTENCIA: 'Asistencia',
      RETARDO: 'Retardo',
      FALTA: 'Falta',
      INCAPACIDAD: 'Incapacidad',
      VACACIONES: 'Vacaciones',
      BAJA: 'Baja',
      SIN_REGISTRO: 'SinRegistro',
    }[key] || key
  )
}

function emptyStatusCounts() {
  return Object.fromEntries(ATTENDANCE_STATUS_KEYS.map((k) => [k, 0]))
}

function buildAreaBreakdown(rows) {
  const byArea = groupBy(rows, (r) => r.areaLabel || '—')
  return [...byArea.entries()]
    .map(([area, list]) => ({ area, counts: countByStatus(list), total: list.length }))
    .sort((a, b) => b.total - a.total)
}

function buildShiftBreakdown(rows, t) {
  const byShift = groupBy(rows, (r) => r.shiftLabel || t('export.noShiftLabel'))
  return [...byShift.entries()]
    .map(([shift, list]) => ({ shift, counts: countByStatus(list), total: list.length }))
    .sort((a, b) => b.total - a.total)
}

// Colapsa todo lo que exceda las primeras N filas (ya ordenadas por total desc) en un solo
// bucket "Otras" -- SUMA real de estatus, nunca se pierde a nadie (usado solo para la grafica
// de barras por area, que no puede mostrar 20+ barras legibles; la tabla RESUMEN POR AREA
// completa, sin colapsar, sigue abajo con todas las areas reales una por una).
function collapseTopN(breakdown, n, otherLabel) {
  if (breakdown.length <= n) return breakdown
  const top = breakdown.slice(0, n)
  const rest = breakdown.slice(n)
  const otherCounts = emptyStatusCounts()
  let otherTotal = 0
  rest.forEach((r) => {
    ATTENDANCE_STATUS_KEYS.forEach((k) => {
      otherCounts[k] += r.counts[k]
    })
    otherTotal += r.total
  })
  return [...top, { area: otherLabel, counts: otherCounts, total: otherTotal }]
}

function writeBreakdownStatusTable(ws, startRow, title, firstColLabel, entries, t) {
  let row = writeSectionTitle(ws, startRow, title)
  const headers = [
    firstColLabel,
    t('export.kpiAsistencia'),
    t('export.kpiRetardo'),
    t('export.kpiFalta'),
    t('export.kpiIncapacidad'),
    t('export.kpiVacaciones'),
    t('export.kpiBaja'),
    t('export.kpiSinRegistro'),
    t('export.colTotal'),
  ]
  headers.forEach((h, idx) => {
    ws.getCell(row, idx + 1).value = h
  })
  styleHeaderCells(ws, row, 1, headers.length, { navy: false })
  row += 1

  const totals = emptyStatusCounts()
  let grandTotal = 0
  if (entries.length === 0) {
    ws.getCell(row, 1).value = t('export.noRecords')
    row += 1
  } else {
    entries.forEach(([label, counts], idx) => {
      const rowTotal = ATTENDANCE_STATUS_KEYS.reduce((s, k) => s + counts[k], 0)
      const values = [label, ...ATTENDANCE_STATUS_KEYS.map((k) => counts[k]), rowTotal]
      values.forEach((v, colIdx) => {
        ws.getCell(row, colIdx + 1).value = v
      })
      styleDataRow(ws, row, 1, headers.length, idx % 2 === 1)
      ATTENDANCE_STATUS_KEYS.forEach((k) => {
        totals[k] += counts[k]
      })
      grandTotal += rowTotal
      row += 1
    })
  }

  const totalValues = [
    t('export.totalGeneral'),
    ...ATTENDANCE_STATUS_KEYS.map((k) => totals[k]),
    grandTotal,
  ]
  totalValues.forEach((v, colIdx) => {
    ws.getCell(row, colIdx + 1).value = v
  })
  styleHeaderCells(ws, row, 1, headers.length, { navy: false })
  row += 1

  return row + 1
}

// ==================================================================== Hoja "DETALLE PERSONAL"

const DETAIL_COLUMNS = (t) => [
  { key: 'no', header: t('export.colNo'), width: 6 },
  { key: 'employeeNumber', header: t('export.colEmployeeNumber'), width: 14 },
  { key: 'name', header: t('export.colFullName'), width: 32 },
  { key: 'areaLabel', header: t('export.colArea'), width: 22 },
  { key: 'stationLabel', header: t('export.colStation'), width: 18 },
  { key: 'roleLabel', header: t('export.colRole'), width: 24 },
  { key: 'shiftLabel', header: t('export.colShift'), width: 14 },
  { key: 'expectedTime', header: t('export.colExpectedTime'), width: 13 },
  { key: 'checkInTime', header: t('export.colCheckInTime'), width: 14 },
  { key: 'statusLabel', header: t('export.colStatus'), width: 16 },
  { key: 'observaciones', header: t('export.colObservations'), width: 34 },
]

function buildDetailSheet(workbook, { rows, meta, t }, sheetName, filterFn) {
  const ws = workbook.addWorksheet(sheetName)
  const columns = DETAIL_COLUMNS(t)
  ws.columns = columns.map((c) => ({ width: c.width }))

  let row = 1
  ws.mergeCells(row, 1, row, columns.length)
  const titleCell = ws.getCell(row, 1)
  titleCell.value = `${sheetName} — ${meta.periodLabel}`
  titleCell.font = { bold: true, size: 13, color: { argb: COLOR_WHITE } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NAVY } }
  titleCell.alignment = { vertical: 'middle' }
  ws.getRow(row).height = 24
  row += 2

  const headerRow = row
  columns.forEach((c, idx) => {
    ws.getCell(headerRow, idx + 1).value = c.header
  })
  styleHeaderCells(ws, headerRow, 1, columns.length)
  row += 1

  const filtered = filterFn ? rows.filter(filterFn) : rows
  if (filtered.length === 0) {
    ws.mergeCells(row, 1, row, columns.length)
    const emptyCell = ws.getCell(row, 1)
    emptyCell.value = t('export.noRecords')
    emptyCell.alignment = { horizontal: 'center' }
    emptyCell.font = { italic: true, color: { argb: 'FF94A3B8' } }
    row += 1
  } else {
    filtered.forEach((r, idx) => {
      const values = [
        idx + 1,
        r.employeeNumber,
        r.name,
        r.areaLabel,
        r.stationLabel,
        r.roleLabel,
        r.shiftLabel,
        r.expectedTime,
        r.checkInTime,
        r.statusLabel,
        r.observaciones,
      ]
      values.forEach((v, colIdx) => {
        ws.getCell(row, colIdx + 1).value = v
      })
      styleDataRow(ws, row, 1, columns.length, idx % 2 === 1)
      const statusColIdx = columns.findIndex((c) => c.key === 'statusLabel') + 1
      const style = STATUS_STYLE[r.statusKey] || STATUS_STYLE.SIN_REGISTRO
      const statusCell = ws.getCell(row, statusColIdx)
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } }
      statusCell.font = { bold: true, color: { argb: style.text } }
      statusCell.alignment = { horizontal: 'center' }
      row += 1
    })

    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: headerRow, column: columns.length },
    }
  }

  // Encabezado congelado (2026-09-14, pedido explicito) -- CON topLeftCell, el fix real del bug
  // de duplicacion visual ya documentado arriba y en la memoria del proyecto (freeze panes sin
  // topLeftCell en exceljs). Se congela hasta la fila de encabezado (headerRow), el panel con
  // scroll arranca exactamente en la primera fila de datos.
  ws.views = [
    { state: 'frozen', ySplit: headerRow, topLeftCell: `A${headerRow + 1}`, activeCell: 'A1' },
  ]

  return filtered.length
}

// ==================================================================== Nombre de archivo

function sanitizeFileNamePart(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos ya separados por NFD (José -> Jose)
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function buildFileName({ dateLabel, areaFilterLabel }) {
  const parts = ['Reporte_Asistencia']
  if (areaFilterLabel) parts.push(sanitizeFileNamePart(areaFilterLabel))
  parts.push(dateLabel)
  return `${parts.join('_')}.xlsx`
}

/**
 * rows: [{ employeeNumber, name, areaLabel, stationLabel, roleLabel, shiftLabel, expectedTime,
 *          checkInTime, statusKey, statusLabel, observaciones }] -- ya resueltas por
 * AsistenciaPage.jsx (misma logica real que ya decide cada estado en pantalla).
 * meta: { periodLabel, shiftLabel, areaLabel, dateFileLabel, areaFilterLabel }
 */
export async function exportAsistenciaToExcel({ rows, meta, t }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = t('export.companyName')
  workbook.created = new Date()

  buildSummarySheet(workbook, { rows, meta, t })
  buildDetailSheet(workbook, { rows, meta, t }, t('export.sheetDetail'), null)
  buildDetailSheet(
    workbook,
    { rows, meta, t },
    t('export.sheetFaltas'),
    (r) => r.statusKey === 'FALTA',
  )
  buildDetailSheet(
    workbook,
    { rows, meta, t },
    t('export.sheetIncapacidades'),
    (r) => r.statusKey === 'INCAPACIDAD',
  )
  buildDetailSheet(
    workbook,
    { rows, meta, t },
    t('export.sheetVacaciones'),
    (r) => r.statusKey === 'VACACIONES',
  )
  buildDetailSheet(
    workbook,
    { rows, meta, t },
    t('export.sheetBajas'),
    (r) => r.statusKey === 'BAJA',
  )

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = buildFileName({
    dateLabel: meta.dateFileLabel,
    areaFilterLabel: meta.areaFilterLabel,
  })
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
