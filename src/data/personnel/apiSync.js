/* ─────────────────────────────────────────────
   Puente entre el store local (localStorage) y el backend real
   (/api/personnel/*, Fase 1 ya en produccion). Fase 2: checkin/move/
   release/etc. siguen escribiendo local PRIMERO (signatures sincronas
   sin cambios para toda la UI que ya los usa) y esta capa manda cada
   escritura al servidor en segundo plano (fire-and-forget); un sondeo
   periodico jala /api/personnel/roster y fusiona lo que cambio en
   OTRO dispositivo de vuelta al store local, disparando notify() para
   que la UI se refresque sola. Esto es lo que arregla el bug real
   reportado 2026-08-24 (una lider mueve a alguien y no se ve en otro
   dispositivo hasta recargar).

   Los ids de empleado son distintos en cada lado (local: ids del
   snapshot/EMPLOYEE_DIRECTORY o `emp-<ts>-<n>`; servidor: cuid de
   Prisma) — serverIdByLocalId hace la traduccion, reconstruida en
   cada poll igual que el seed (numero de empleado real cuando existe;
   nombre completo para PROYECTO/PENDIENTE, mismo criterio que
   SHARED_PLACEHOLDER_NUMBERS en repository.js). ── */
import dayjs from 'dayjs'
import {
  readAssignments, writeAssignments, readEmployees, writeEmployees,
  readMovements, writeMovements, readBaselineSuppressed, writeBaselineSuppressed,
  notify,
} from './store'
import { EMPLOYEE_DIRECTORY } from './directory'

const POLL_MS = 7000
const RECENT_WRITE_GRACE_MS = 15000
const PLACEHOLDER_NUMBERS = new Set(['PROYECTO', 'PENDIENTE'])

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

const serverIdByLocalId = new Map()
const serverPendingIdByLocalId = new Map()
/* Escrituras optimistas muy recientes de ESTE dispositivo — el poll
   las ignora un rato para no revertir el cambio local mientras el
   POST en segundo plano todavia no le llega al servidor (si no, un
   poll que cae justo en ese hueco podria "regresar" a alguien que la
   propia lider acaba de mover). */
const recentWrites = new Map()
export function markRecentWrite(employeeId) {
  recentWrites.set(employeeId, Date.now())
}
function isRecentlyWritten(employeeId) {
  const t = recentWrites.get(employeeId)
  return t != null && Date.now() - t < RECENT_WRITE_GRACE_MS
}

function isPlaceholderNumber(number) {
  return !number || PLACEHOLDER_NUMBERS.has(number)
}

/* ── Fire-and-forget hacia el servidor tras cada escritura local.
   Si falla, solo se registra en consola: el siguiente poll reconcilia
   el estado real (ver pollOnce). ── */

export function syncCheckIn({ employeeId, employeeNumber, name, areaId, stationId, shift }) {
  markRecentWrite(employeeId)
  const serverId = serverIdByLocalId.get(employeeId)
  const placeholder = isPlaceholderNumber(employeeNumber)
  apiFetch('/api/personnel/checkin', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: serverId || undefined,
      employeeNumber: serverId || placeholder ? undefined : employeeNumber,
      name: serverId ? undefined : name,
      workAreaId: areaId,
      stationName: stationId,
      shift,
    }),
  }).then((data) => {
    if (data?.employee?.id) serverIdByLocalId.set(employeeId, data.employee.id)
  }).catch((e) => console.error('[personnel-sync] checkin', e))
}

export function syncMove({ employeeId, toAreaId, toStationId, shift }) {
  markRecentWrite(employeeId)
  const serverId = serverIdByLocalId.get(employeeId)
  if (!serverId) { console.warn('[personnel-sync] move: sin serverId todavia, se omite (el siguiente poll lo resuelve)'); return }
  apiFetch('/api/personnel/move', {
    method: 'POST',
    body: JSON.stringify({ employeeId: serverId, workAreaId: toAreaId, stationName: toStationId, shift }),
  }).catch((e) => console.error('[personnel-sync] move', e))
}

export function syncRelease({ employeeId }) {
  markRecentWrite(employeeId)
  const serverId = serverIdByLocalId.get(employeeId)
  if (!serverId) { console.warn('[personnel-sync] release: sin serverId todavia, se omite'); return }
  apiFetch('/api/personnel/release', {
    method: 'POST',
    body: JSON.stringify({ employeeId: serverId }),
  }).catch((e) => console.error('[personnel-sync] release', e))
}

export function syncSuppressBaseline() {
  apiFetch('/api/personnel/suppress-baseline', { method: 'POST' })
    .catch((e) => console.error('[personnel-sync] suppress-baseline', e))
}

export function syncRestoreBaseline() {
  apiFetch('/api/personnel/restore-baseline', { method: 'POST' })
    .catch((e) => console.error('[personnel-sync] restore-baseline', e))
}

export function syncRequestMove({ localRequestId, employeeId, toAreaId, toStationId, shift }) {
  const serverId = serverIdByLocalId.get(employeeId)
  if (!serverId) { console.warn('[personnel-sync] request-move: sin serverId todavia, se omite'); return }
  apiFetch('/api/personnel/request-move', {
    method: 'POST',
    body: JSON.stringify({ employeeId: serverId, workAreaId: toAreaId, stationName: toStationId, shift }),
  }).then((data) => {
    if (data?.pendingMove?.id) serverPendingIdByLocalId.set(localRequestId, data.pendingMove.id)
  }).catch((e) => console.error('[personnel-sync] request-move', e))
}

export function syncApproveMove({ localRequestId, employeeId }) {
  if (employeeId) markRecentWrite(employeeId)
  const serverId = serverPendingIdByLocalId.get(localRequestId)
  if (!serverId) { console.warn('[personnel-sync] approve-move: solicitud no sincronizada todavia, se omite'); return }
  apiFetch('/api/personnel/approve-move', {
    method: 'POST',
    body: JSON.stringify({ pendingMoveId: serverId }),
  }).catch((e) => console.error('[personnel-sync] approve-move', e))
}

export function syncRejectMove({ localRequestId, reason }) {
  const serverId = serverPendingIdByLocalId.get(localRequestId)
  if (!serverId) { console.warn('[personnel-sync] reject-move: solicitud no sincronizada todavia, se omite'); return }
  apiFetch('/api/personnel/reject-move', {
    method: 'POST',
    body: JSON.stringify({ pendingMoveId: serverId, reason }),
  }).catch((e) => console.error('[personnel-sync] reject-move', e))
}

/* ── Sondeo: jala /api/personnel/roster y fusiona LIVE/NONE/
   baselineSuppressed al store local (SNAPSHOT no requiere fusion —
   ya es el comportamiento por defecto del calculo local). ── */

function buildLocalIndex() {
  const byNumber = new Map()
  const byName = new Map()
  const all = [...EMPLOYEE_DIRECTORY, ...readEmployees()]
  all.forEach((e) => {
    if (!isPlaceholderNumber(e.employeeNumber)) byNumber.set(e.employeeNumber, e.id)
    else byName.set(e.name, e.id)
  })
  return { byNumber, byName }
}

async function pollOnce() {
  const { roster } = await apiFetch('/api/personnel/roster')
  const { byNumber, byName } = buildLocalIndex()

  const dynamicEmployees = readEmployees()
  const newDynamicEmployees = []
  const assignments = readAssignments()
  const movements = readMovements()
  const baselineSuppressed = new Set(readBaselineSuppressed())
  const today = dayjs().format('YYYY-MM-DD')
  const touchedIds = new Set(movements.filter((m) => m.date === today).map((m) => m.employeeId))
  let changed = false

  roster.forEach((row) => {
    const placeholder = isPlaceholderNumber(row.employeeNumber)
    let localId = placeholder ? byName.get(row.fullName) : byNumber.get(row.employeeNumber)

    if (!localId) {
      // Empleado que no existe localmente todavia (dado de alta desde otro dispositivo).
      localId = row.employeeId
      newDynamicEmployees.push({ id: localId, employeeNumber: row.employeeNumber || 'PROYECTO', name: row.fullName, status: 'Activo', createdAt: null })
      if (placeholder) byName.set(row.fullName, localId)
      else byNumber.set(row.employeeNumber, localId)
    }
    serverIdByLocalId.set(localId, row.employeeId)

    if (row.baselineSuppressed && !baselineSuppressed.has(localId)) {
      baselineSuppressed.add(localId)
      changed = true
    }

    if (isRecentlyWritten(localId)) return // confiar en el optimista local un rato

    const existingIdx = assignments.findIndex((a) => a.employeeId === localId && a.date === today)

    if (row.placement.source === 'LIVE') {
      const p = row.placement
      const checkInAt = p.assignedAt ? dayjs(p.assignedAt).format('HH:mm') : dayjs().format('HH:mm')
      const prev = existingIdx !== -1 ? assignments[existingIdx] : null
      if (!prev || prev.areaId !== p.workAreaCode || prev.stationId !== p.stationName || prev.shift !== p.shift) {
        const next = {
          id: prev ? prev.id : `sync-${localId}-${today}`,
          employeeId: localId,
          employeeNumber: row.employeeNumber || 'PROYECTO',
          date: today,
          shift: p.shift,
          areaId: p.workAreaCode,
          stationId: p.stationName,
          checkInAt,
          status: 'PRESENTE',
          createdAt: prev ? prev.createdAt : (p.assignedAt || dayjs().toISOString()),
          updatedAt: p.assignedAt || dayjs().toISOString(),
        }
        if (existingIdx !== -1) assignments[existingIdx] = next
        else assignments.push(next)
        changed = true
      }
      if (!touchedIds.has(localId)) {
        movements.push({ id: `sync-mov-${localId}-${today}`, employeeId: localId, employeeNumber: row.employeeNumber || 'PROYECTO', date: today, fromAreaId: null, fromStationId: null, toAreaId: p.workAreaCode, toStationId: p.stationName, movedAt: checkInAt, shift: p.shift, movedBy: null, type: 'MOVE' })
        touchedIds.add(localId)
        changed = true
      }
    } else if (row.placement.source === 'NONE') {
      if (existingIdx !== -1) {
        assignments.splice(existingIdx, 1)
        changed = true
      }
      if (!touchedIds.has(localId)) {
        movements.push({ id: `sync-mov-${localId}-${today}`, employeeId: localId, employeeNumber: row.employeeNumber || 'PROYECTO', date: today, fromAreaId: null, fromStationId: null, toAreaId: null, toStationId: null, movedAt: dayjs().format('HH:mm'), shift: null, movedBy: null, type: 'RELEASE' })
        touchedIds.add(localId)
        changed = true
      }
    }
  })

  if (newDynamicEmployees.length) {
    writeEmployees([...dynamicEmployees, ...newDynamicEmployees])
    changed = true
  }
  if (changed) {
    writeAssignments(assignments)
    writeMovements(movements)
    writeBaselineSuppressed([...baselineSuppressed])
    notify()
  }
}

let started = false
export function startPersonnelSync() {
  if (started || typeof window === 'undefined') return
  started = true
  const tick = () => { pollOnce().catch((e) => console.error('[personnel-sync] poll', e)) }
  tick()
  setInterval(tick, POLL_MS)
}
