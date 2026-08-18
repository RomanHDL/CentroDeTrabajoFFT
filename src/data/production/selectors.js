import { WORK_CENTERS, OPERATIONAL_STATUS, workCenterById } from './catalog'
import { CURRENT_PRODUCTION_TODAY, OPERATIONAL_STATUS_BY_WC, lastHourDelta } from './production'
import { getAreaCountToday, getPersonnelPresentToday, getLineWorkstationsWithOccupancy } from '../personnel/repository'
import { getLineCapacity } from '../personnel/workstations'

/* ── Calculos de productividad (centralizados, no en UI) ── */

export function cumplimientoPct(production, target) {
  if (!target) return null
  return Math.round((production / target) * 100)
}

export function diferencia(production, target) {
  if (target == null || production == null) return null
  return production - target
}

export function productividadPorPersona(production, personnel) {
  if (!personnel) return null
  return Math.round((production / personnel) * 10) / 10
}

/* Colores de avance — nunca depender solo del color,
   siempre acompañar con texto/porcentaje. */
export function progressTone(pct) {
  if (pct == null) return { tone: 'default', label: 'Sin datos', accent: 'slate' }
  if (pct >= 100) return { tone: 'ok', label: 'Meta alcanzada', accent: 'green' }
  if (pct >= 80) return { tone: 'info', label: 'Producción normal', accent: 'blue' }
  if (pct >= 60) return { tone: 'warn', label: 'Debajo de lo esperado', accent: 'amber' }
  return { tone: 'bad', label: 'Retraso importante', accent: 'red' }
}

export function operationalStatusOf(workCenterId) {
  const key = OPERATIONAL_STATUS_BY_WC[workCenterId] || 'OPERANDO'
  return { key, ...OPERATIONAL_STATUS[key] }
}

/* Resumen por linea/area, listo para las cards del dashboard. */
export function lineSummary(workCenterId) {
  const wc = workCenterById(workCenterId)
  if (!wc) return null
  const production = CURRENT_PRODUCTION_TODAY[workCenterId] || 0
  const personnel = getAreaCountToday(workCenterId)
  const pct = cumplimientoPct(production, wc.dailyTarget)
  const workstations = getLineWorkstationsWithOccupancy(workCenterId)
  const stationsOccupied = workstations.filter(w => w.occupants.length > 0).length
  const stationsAvailable = workstations.filter(w => w.isAvailable).length
  return {
    id: wc.id,
    name: wc.name,
    kind: wc.kind,
    personnel,
    capacityTotal: getLineCapacity(workCenterId),
    stationsOccupied,
    stationsAvailable,
    production,
    target: wc.dailyTarget,
    pct,
    diferencia: diferencia(production, wc.dailyTarget),
    productividad: productividadPorPersona(production, personnel),
    ultimaHora: lastHourDelta(workCenterId),
    tone: progressTone(pct),
    status: operationalStatusOf(workCenterId),
  }
}

export function allLineSummaries() {
  return WORK_CENTERS.map(wc => lineSummary(wc.id))
}

/* KPIs generales del dashboard. */
export function generalKpis() {
  const summaries = allLineSummaries()
  const totalProduction = summaries.reduce((s, r) => s + r.production, 0)
  const totalTarget = summaries.reduce((s, r) => s + r.target, 0)
  const activeEmployees = getPersonnelPresentToday()
  const operating = summaries.filter(r => r.status.key === 'OPERANDO').length
  const topLine = summaries.reduce((top, r) => (!top || r.production > top.production ? r : top), null)

  return {
    personalActivo: activeEmployees,
    produccionHoy: totalProduction,
    metaDia: totalTarget,
    avancePct: cumplimientoPct(totalProduction, totalTarget),
    lineasOperando: operating,
    lineasTotal: summaries.length,
    lineaTop: topLine,
  }
}

/* Alertas derivadas del estado real de cada linea — nunca
   texto inventado, siempre calculado desde los datos. */
export function buildAlerts() {
  const summaries = allLineSummaries()
  const alerts = []

  summaries.forEach((r) => {
    if (r.status.key === 'DETENIDO') {
      alerts.push({ level: 'bad', text: `${r.name} detenida` })
    } else if (r.pct != null && r.pct < 60) {
      alerts.push({ level: 'bad', text: `${r.name} debajo del 60% de meta (${r.pct}%)` })
    } else if (r.status.key === 'ATENCION') {
      alerts.push({ level: 'warn', text: `${r.name} en atención — ${r.pct ?? 0}% de avance` })
    } else if (r.pct != null && r.pct >= 100) {
      alerts.push({ level: 'ok', text: `${r.name} superó su meta (${r.pct}%)` })
    }
  })

  return alerts
}
