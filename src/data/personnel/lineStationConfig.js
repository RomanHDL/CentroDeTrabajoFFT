/* ─────────────────────────────────────────────
   Capa de fetch/cache hacia /api/work-areas/:code/workstations (2026-08-27,
   "estaciones configurables por ADMINISTRADOR" -- WC LINEA 0-10). Mismo
   patron `apiFetch` que ya usa src/data/personnel/apiSync.js (no se
   inventa un mecanismo distinto) -- fetch en segundo plano, cache local en
   memoria, `notify()` a quien este suscrito para que la UI se refresque.

   `getWorkstationsForLine` (workstations.js) consulta `getCachedLineStationConfig(lineId)`
   ANTES de generar la lista en JS -- mientras la cache este vacia (primera
   pintura, o una linea que ningun ADMINISTRADOR configuro todavia via este
   mismo backend) sigue devolviendo exactamente el generador de siempre, cero
   cambio de comportamiento por defecto. Solo LineDetailDrawer.jsx (Grupo A)
   llama a `fetchLineStationConfig`, asi que Grupo B/C nunca activan esto. ───────────────────────────────────────────── */

const configByLine = new Map()
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}
export function subscribeLineStationConfig(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.error) || `${path} -> ${res.status}`)
  return data
}

export function getCachedLineStationConfig(lineId) {
  return configByLine.get(lineId) || null
}

export async function fetchLineStationConfig(lineId) {
  try {
    const data = await apiFetch(`/api/work-areas/${encodeURIComponent(lineId)}/workstations`)
    const rows = (data.workstations || []).map((w) => ({ ...w, lineId }))
    configByLine.set(lineId, rows)
    notify()
    return rows
  } catch {
    // Sin red, o linea aun no sembrada en el backend real -- se queda con
    // lo que ya hubiera en cache (o null, que hace caer a workstations.js
    // al generador JS de siempre).
    return getCachedLineStationConfig(lineId)
  }
}

export async function createLineStation(lineId, payload) {
  await apiFetch(`/api/work-areas/${encodeURIComponent(lineId)}/workstations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return fetchLineStationConfig(lineId)
}

export async function updateLineStation(lineId, stationDbId, payload) {
  await apiFetch(
    `/api/work-areas/${encodeURIComponent(lineId)}/workstations/${encodeURIComponent(stationDbId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return fetchLineStationConfig(lineId)
}

export async function deactivateLineStation(lineId, stationDbId) {
  return updateLineStation(lineId, stationDbId, { active: false })
}

export async function reorderLineStations(lineId, orderedDbIds) {
  await apiFetch(`/api/work-areas/${encodeURIComponent(lineId)}/workstations/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds: orderedDbIds }),
  })
  return fetchLineStationConfig(lineId)
}
