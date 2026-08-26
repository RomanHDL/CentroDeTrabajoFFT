import { LINES_ONLY, workCenterById } from '../production/catalog'
import { getAllAreaSummaries, getAreaHeadcount } from '../production/personnelByArea'

/* ─────────────────────────────────────────────
   Capa de calculo EXCLUSIVA del rediseño del Dashboard (2026-08-25).
   Nunca reimplementa real/ideal/faltante/cobertura: todo se apoya en
   los mismos selectors que ya usan Centro de Trabajo y el plano 2D
   (personnelByArea.js) -- si esos cambian, esto cambia solo, sin una
   segunda fuente de verdad.

   La clasificacion de 4 estados (COMPLETA/PARCIAL/FALTA/SIN_PERSONAL)
   es una copia deliberada -- no una importacion -- de la misma logica
   que ya vive en OperatingFloorPlan.jsx (ahi documentada como "puramente
   de presentacion"). No se toca ese archivo porque es compartido con
   Layout 2D y Centro de Trabajo, fuera de alcance de este rediseño
   exclusivo del Dashboard. ───────────────────────────────────────────── */

export const AREA_STATUS_META = {
  COMPLETA: { key: 'COMPLETA', color: '#10B981', label: 'Completa' },
  PARCIAL: { key: 'PARCIAL', color: '#3B82F6', label: 'Parcial' },
  FALTA: { key: 'FALTA', color: '#EF4444', label: 'Falta personal' },
  SIN_PERSONAL: { key: 'SIN_PERSONAL', color: '#94A3B8', label: 'Sin personal' },
}

export function classifyAreaStatus(real, ideal) {
  if (ideal == null) return null
  if (real <= 0) return 'SIN_PERSONAL'
  if (real >= ideal) return 'COMPLETA'
  if (real >= ideal - 1 || real / ideal >= 0.75) return 'PARCIAL'
  return 'FALTA'
}

/* Areas para las graficas del Dashboard -- misma fuente que "Resumen por
   área" de Centro de Trabajo (getAllAreaSummaries). Se excluyen SOLO las
   areas puramente decorativas: sin plantilla oficial (ideal null) Y sin
   ninguna persona real hoy (count 0) -- conveyors, Sellado, Insumos,
   Suministro de material, que nunca han tenido personal y no aportan
   nada a un dashboard ejecutivo. Cualquier area CON ideal definido se
   conserva aunque este en 0 (es un hueco real que vale la pena mostrar,
   ej. "CT Gerente 0/1"). */
export function getDashboardAreas() {
  return getAllAreaSummaries()
    .filter((a) => a.ideal != null || a.count > 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      actual: a.count,
      ideal: a.ideal,
      missing: a.ideal != null ? Math.max(0, a.ideal - a.count) : null,
      coveragePct: a.ideal != null && a.ideal > 0 ? Math.round((a.count / a.ideal) * 1000) / 10 : null,
      status: classifyAreaStatus(a.count, a.ideal),
    }))
}

/* Cuenta AREAS por estado (no personas) -- a proposito: los 4 estados
   son una propiedad de cada area (real vs su propio ideal), nunca de
   una persona individual. Solo areas con ideal definido participan
   (status null se ignora), para no fingir un estado de "sin plantilla". */
export function getAreaStatusCounts(areas) {
  const counts = { COMPLETA: 0, PARCIAL: 0, FALTA: 0, SIN_PERSONAL: 0 }
  areas.forEach((a) => { if (a.status) counts[a.status] += 1 })
  return counts
}

/* Lineas de produccion (LINEA1..10) con personal incompleto -- para el
   hallazgo "N líneas requieren atención", distinto de "areas con
   faltante" en general (una línea es un WORK_CENTER kind:'linea', las
   demas areas no cuentan aqui). */
export function getIncompleteLines() {
  return LINES_ONLY
    .map((wc) => ({ id: wc.id, name: wc.name, actual: getAreaHeadcount(wc.id), ideal: wc.idealHeadcount }))
    .filter((l) => l.ideal != null && l.actual < l.ideal)
}

function shortAreaName(name) {
  return name.replace(/^CT /, '')
}

/* Hallazgos del dia -- reglas deterministicas sobre datos reales, nunca
   texto generado por IA/inventado (2026-08-25, a peticion explicita del
   usuario). Orden de prioridad fijo (Parte 22 del prompt): areas sin
   personal > faltantes criticos > lineas incompletas > movimientos
   pendientes > areas completas > areas sobre plantilla > (relleno)
   movimientos de hoy. Maximo 6, minimo lo que realmente aplique (puede
   haber menos de 4 si el dia esta genuinamente bien). */
export function getDashboardFindings({ areas, incompleteLines, pendingMovesCount, canSeeApprovals, movementsToday }) {
  const findings = []

  const withIdeal = areas.filter((a) => a.ideal != null)

  const noPersonnel = withIdeal.filter((a) => a.status === 'SIN_PERSONAL')
  noPersonnel.slice(0, 2).forEach((a) => {
    findings.push({
      id: `none-${a.id}`, tone: 'bad',
      title: `${shortAreaName(a.name)} no tiene personal asignado.`,
      detail: `Requiere ${a.ideal} persona${a.ideal === 1 ? '' : 's'} para cubrir su plantilla.`,
    })
  })

  const critical = withIdeal
    .filter((a) => a.status === 'FALTA' && (a.missing >= 3 || (a.coveragePct != null && a.coveragePct < 50)))
    .sort((a, b) => b.missing - a.missing)
  critical.slice(0, 2).forEach((a) => {
    findings.push({
      id: `critical-${a.id}`, tone: 'warn',
      title: `${shortAreaName(a.name)} opera al ${a.coveragePct}% de cobertura.`,
      detail: `Faltan ${a.missing} persona${a.missing === 1 ? '' : 's'} para alcanzar la plantilla ideal.`,
    })
  })

  if (incompleteLines.length > 0) {
    const names = incompleteLines.map((l) => shortAreaName(l.name))
    const list = names.length <= 3
      ? names.join(names.length === 2 ? ' y ' : ', ').replace(/, ([^,]*)$/, ' y $1')
      : `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
    findings.push({
      id: 'lines-incomplete', tone: incompleteLines.length >= 3 ? 'bad' : 'warn',
      title: `${incompleteLines.length} línea${incompleteLines.length === 1 ? '' : 's'} de producción con personal incompleto.`,
      detail: list,
    })
  }

  if (canSeeApprovals && pendingMovesCount > 0) {
    findings.push({
      id: 'pending-moves', tone: 'info',
      title: `${pendingMovesCount} movimiento${pendingMovesCount === 1 ? '' : 's'} esperan aprobación.`,
      detail: 'Revísalos en Centro de Trabajo.',
    })
  }

  const complete = withIdeal.filter((a) => a.status === 'COMPLETA')
  if (complete.length > 0) {
    const names = complete.slice(0, 2).map((a) => shortAreaName(a.name))
    const label = complete.length > 2 ? `${names.join(', ')} y ${complete.length - 2} más` : names.join(' y ')
    findings.push({
      id: 'areas-complete', tone: 'ok',
      title: `${label} ${complete.length === 1 ? 'está completa' : 'están completas'}.`,
      detail: `Cobertura del 100% o más en ${complete.length} área${complete.length === 1 ? '' : 's'}.`,
    })
  }

  const overIdeal = withIdeal
    .filter((a) => a.actual > a.ideal)
    .sort((a, b) => (b.actual - b.ideal) - (a.actual - a.ideal))
  if (overIdeal.length > 0) {
    const a = overIdeal[0]
    const surplus = a.actual - a.ideal
    findings.push({
      id: `over-${a.id}`, tone: 'ok',
      title: `${shortAreaName(a.name)} supera su plantilla ideal.`,
      detail: `Cuenta con ${surplus} persona${surplus === 1 ? '' : 's'} adicionales al ideal.`,
    })
  }

  if (findings.length < 4 && movementsToday > 0) {
    findings.push({
      id: 'movements-today', tone: 'info',
      title: `${movementsToday} movimiento${movementsToday === 1 ? '' : 's'} registrados hoy.`,
      detail: 'Incluye asignaciones, movimientos y liberaciones.',
    })
  }

  return findings.slice(0, 6)
}

export function workCenterShortName(id) {
  return shortAreaName(workCenterById(id)?.name || id)
}
