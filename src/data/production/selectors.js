import { WORK_CENTERS, OPERATIONAL_STATUS, workCenterById } from './catalog'
import { HAS_PRODUCTION_SOURCE, lastHourDelta } from './production'
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

/* Sin fuente real de produccion conectada todavia, el estado
   operativo no puede calcularse honestamente — SIN_DATOS para
   todos en vez de asumir "Operando". */
export function operationalStatusOf() {
  const key = HAS_PRODUCTION_SOURCE ? 'OPERANDO' : 'SIN_DATOS'
  return { key, ...OPERATIONAL_STATUS[key] }
}

/* Resumen por linea/area, listo para las cards del dashboard.
   production/target quedan en 0/null hasta que exista una
   fuente real de produccion — nunca se inventan. */
export function lineSummary(workCenterId) {
  const wc = workCenterById(workCenterId)
  if (!wc) return null
  const production = 0
  const target = wc.dailyTarget // null: sin meta configurada
  const personnel = getAreaCountToday(workCenterId)
  const pct = cumplimientoPct(production, target)
  const workstations = getLineWorkstationsWithOccupancy(workCenterId)
  const stationsOccupied = workstations.filter(w => w.occupants.length > 0).length
  const stationsAvailable = workstations.filter(w => w.isAvailable).length
  return {
    id: wc.id,
    name: wc.name,
    kind: wc.kind,
    isProduction: wc.isProduction,
    personnel,
    capacityTotal: getLineCapacity(workCenterId),
    stationsOccupied,
    stationsAvailable,
    production,
    target,
    pct,
    diferencia: target == null ? null : diferencia(production, target),
    productividad: productividadPorPersona(production, personnel),
    ultimaHora: lastHourDelta(workCenterId),
    tone: progressTone(pct),
    status: operationalStatusOf(),
  }
}

export function allLineSummaries() {
  return WORK_CENTERS.map(wc => lineSummary(wc.id))
}

/* KPIs generales del dashboard. */
export function generalKpis() {
  const summaries = allLineSummaries()
  const totalProduction = summaries.reduce((s, r) => s + r.production, 0)
  const totalTarget = summaries.reduce((s, r) => s + (r.target || 0), 0)
  const activeEmployees = getPersonnelPresentToday()
  const operating = summaries.filter(r => r.status.key === 'OPERANDO').length
  const topLine = HAS_PRODUCTION_SOURCE
    ? summaries.reduce((top, r) => (!top || r.production > top.production ? r : top), null)
    : null

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
   texto inventado. Sin fuente de produccion no hay nada que
   alertar de produccion todavia (queda vacio, no se simula). */
export function buildAlerts() {
  return []
}
