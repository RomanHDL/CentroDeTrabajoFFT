// Sync automatico de personal real (SmartControl) -> Employee (2026-09-03, a peticion explicita
// del usuario: "quiero que uses la db de personal en mi pagina para que cuando haya bajas se
// eliminen en automatico y cuando haya gente nueva se agreguen"). Reglas deliberadamente
// conservadoras, mismo criterio ya establecido en api/personnel/set-unassigned-reason.js ("nunca
// buscar por nombre cuando no hay numero real, evita reactivar/pisar un fantasma"):
//
// - ALTA automatica: gente de WorkCenterID=49 (FFT/Refurbish Monterrey2, "home" real en
//   SmartControl, confirmado en vivo 2026-09-03 -- WorkCenterID=102/Calidad no tiene a NADIE como
//   home, es solo donde se checan ocasionalmente los de FFT) que tiene EmployeeNumber real (folio)
//   en ADM.UsersComplement -- nunca folio vacio/nulo. areaZona se guarda como null (2026-09-14,
//   cambio explicito a peticion del usuario el dia del lanzamiento real de Asistencia -- "agrega a
//   todos a sin asignar" -- para que cada alta nueva aterrice en "Sin asignar" y un lider la
//   coloque el mismo dia que aparece, en vez de perderse silenciosa bajo un snapshot generico de
//   'PRODUCCION'). `actividad` se llena con el nombre real de ADM.activities (uc.activityid) SI
//   SmartControl lo trae capturado -- confirmado en vivo 2026-09-14 que solo ~30% del roster activo
//   de FFT trae esto, el resto se deja null a proposito (nunca inventar la actividad de quien no la
//   trae real).
//
//   HISTORIA (superada 2026-09-14): hasta esta fecha, ademas del folio real, se exigia una
//   inspeccion propia en oe.WorkPlanInspection en los ultimos 30 dias (motivo: "no se quiere toda
//   la plantilla base, solo quien de verdad sigue trabajando"). Confirmado en vivo 2026-09-14 que
//   ese filtro dejaba fuera a 82 de 111 personas reales con folio (cualquiera que no fuera
//   inspector/calidad, que es casi todo el piso) -- el usuario pidio explicitamente el roster
//   activo COMPLETO ("si hay mucha gente... si porfa") y se agrego a mano ese mismo dia. Este
//   archivo ya no aplica ese filtro de inspeccion -- IsActive=1 + folio real es suficiente.
//
// - BAJA automatica: cualquier Employee activo con employeeNumber real que matchea un folio de
//   SmartControl (ADM.UsersComplement) cuya cuenta este IsActive=0 -- sin importar su area (el
//   folio es un identificador real de toda la empresa: verificado en vivo 2026-09-03 que gente de
//   Paletizado/Accesorios/Soporte tambien matchea folios reales de SmartControl). Usa EXACTAMENTE
//   el mismo mecanismo real de baja que ya existe (api/personnel/set-unassigned-reason.js):
//   unassignedReason='BAJA' + active=false. Si el folio de un Employee NO tiene ningun match en
//   SmartControl, NO se toca -- no es evidencia de baja, puede ser gente en areas que SmartControl
//   no rastrea (Cajas/Chofer/Capacitacion/Ingenieria, confirmado en vivo 2026-09-03: 17 folios
//   reales sin match ahi, ninguno tocado).
//
// - Gente SIN folio (bucket "Proyecto") sigue FUERA de este sync automatico a proposito -- no hay
//   llave real para matchear/deduplicar sin adivinar, y ya hay variantes de nombre reales
//   confirmadas (Yesica/Yessica, Evelyn/Evelin, Erick Canon/Erik Cano Treviño -- este ultimo un
//   duplicado real detectado y corregido a mano 2026-09-14) que harian un match por nombre
//   peligroso. Se maneja a mano (ver scripts/backfill-calidad-personnel-2026-09-03.mjs para el
//   alta manual, una sola vez, de los que Roman ya confirmo).
//
// - Reactivado en produccion 2026-09-14 (ver PERSONNEL_SYNC_PAUSED en prod-server.js) -- estuvo
//   pausado desde 2026-09-11 porque cada corrida re-agregaba gente que el usuario habia BORRADO A
//   MANO (delete real de la fila, no baja/desactivacion) de "Personal sin asignar". Este sync
//   nunca reinserta a alguien cuyo folio siga existiendo en Employee (activo o no, ver
//   `employeeByNumber` abajo) -- el problema de 09-11 solo puede repetirse si alguien vuelve a
//   BORRAR (no desactivar) una fila real; la forma correcta de "quitar" a alguien de aqui en
//   adelante es BAJA (active=false), nunca un delete.

import { eq, isNotNull } from 'drizzle-orm'
import sql from 'mssql'
import { db, employee as employeeTable, user as userTable } from './db/client.js'

let poolPromise = null

function getConfig() {
  const {
    SMARTCONTROL_SQLSERVER_HOST,
    SMARTCONTROL_SQLSERVER_PORT,
    SMARTCONTROL_SQLSERVER_USER,
    SMARTCONTROL_SQLSERVER_PASSWORD,
    SMARTCONTROL_SQLSERVER_DB,
  } = process.env
  if (
    !SMARTCONTROL_SQLSERVER_HOST ||
    !SMARTCONTROL_SQLSERVER_USER ||
    !SMARTCONTROL_SQLSERVER_PASSWORD ||
    !SMARTCONTROL_SQLSERVER_DB
  ) {
    return null
  }
  return {
    server: SMARTCONTROL_SQLSERVER_HOST,
    port: Number(SMARTCONTROL_SQLSERVER_PORT) || 1433,
    user: SMARTCONTROL_SQLSERVER_USER,
    password: SMARTCONTROL_SQLSERVER_PASSWORD,
    database: SMARTCONTROL_SQLSERVER_DB,
    options: { encrypt: true, trustServerCertificate: true },
    pool: { max: 3, min: 0, idleTimeoutMillis: 30000 },
  }
}

export function isPersonnelSyncConfigured() {
  return getConfig() !== null
}

async function getPool() {
  if (poolPromise) return poolPromise
  const config = getConfig()
  if (!config) throw new Error('SmartControl SQL Server no configurado (faltan env vars).')
  poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
    poolPromise = null
    throw err
  })
  return poolPromise
}

const FFT_WORKCENTER_ID = 49

function buildFullName(r) {
  return [r.Name, r.SecondName, r.LastName, r.SecondLastName]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' ')
}

// Mismo formato DD/MM/YYYY ya usado por el resto de las filas de Employee.fechaIngreso (columna
// texto libre, nunca fecha real -- se respeta el formato existente en vez de cambiarlo).
function formatFechaIngreso(hireDate) {
  if (!hireDate) return null
  const d = new Date(hireDate)
  if (Number.isNaN(d.getTime())) return null
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

async function getActiveFolioedFftCandidates(pool) {
  // Sin el filtro de "inspeccion propia reciente" (retirado 2026-09-14, ver nota grande arriba) --
  // solo IsActive=1 + folio real. LEFT JOIN a ADM.activities para traer la actividad especifica
  // real (uc.activityid) cuando SmartControl la tiene capturada; null cuando no (nunca se inventa).
  // ul.Turno (2026-09-17, "Personal"/"Personal sin asignar" divididos por turno real): entero real
  // de ADM.UsersLogin, mapeado via mapTurno() abajo -- se trae aqui mismo para el ALTA, nunca una
  // consulta aparte para gente nueva.
  const result = await pool.request().query(`
    SELECT DISTINCT uc.EmployeeNumber, uc.HireDate, ul.Name, ul.SecondName, ul.LastName, ul.SecondLastName,
      a.activityname_es AS ActivityNameEs, ul.Turno
    FROM ADM.UsersLogin ul
    INNER JOIN ADM.UsersComplement uc ON uc.UserId = ul.UserId
    LEFT JOIN ADM.activities a ON a.activityid = uc.activityid
    WHERE ul.WorkCenterID = ${FFT_WORKCENTER_ID}
      AND ul.IsActive = 1
      AND uc.EmployeeNumber IS NOT NULL AND LTRIM(RTRIM(uc.EmployeeNumber)) <> ''
  `)
  return result.recordset
}

// Catalogo real ADM.Turno (SmartControl, confirmado en vivo 2026-09-17): turnoID=1 ->
// 'Matutino', turnoID=2 -> 'Nocturno' -- los UNICOS 2 valores que existen hoy. Cualquier otro
// entero (o null) se mapea a null a proposito -- nunca se inventa un turno que SmartControl no
// trae capturado. NO CONFUNDIR con DailyAssignment.shift (turno de checkin, texto libre, ver
// SHIFT_OPTIONS en src/data/production/catalog.js) -- este es el turno real/de casa de RRHH.
function mapTurno(turnoId) {
  if (turnoId === 1) return 'MATUTINO'
  if (turnoId === 2) return 'NOCTURNO'
  return null
}

async function getFolioActiveStatusMap(pool, employeeNumbers) {
  const map = new Map()
  if (!employeeNumbers.length) return map
  const request = pool.request()
  const placeholders = employeeNumbers.map((n, i) => {
    request.input(`n${i}`, sql.NVarChar, n)
    return `@n${i}`
  })
  const result = await request.query(`
    SELECT uc.EmployeeNumber, ul.IsActive
    FROM ADM.UsersComplement uc
    INNER JOIN ADM.UsersLogin ul ON ul.UserId = uc.UserId
    WHERE uc.EmployeeNumber IN (${placeholders.join(', ')})
  `)
  for (const r of result.recordset) map.set(String(r.EmployeeNumber).trim(), !!r.IsActive)
  return map
}

// Backfill continuo del turno real (2026-09-17, a peticion explicita del usuario: "Personal"/
// "Personal sin asignar" divididos por turno real de SmartControl, no inventado). Mismo patron
// exacto que getFolioActiveStatusMap de arriba (mismo IN de folios activos ya conocidos
// localmente), pero trayendo ul.Turno en vez de ul.IsActive -- se corre en CADA ejecucion normal
// del sync (ya activo en produccion) para que un cambio de turno real capturado despues en
// SmartControl (alguien que pasa de Matutino a Nocturno, o a quien apenas le capturan el dato)
// se refleje solo, sin esperar a un backfill manual como el que se corrio una sola vez el
// 2026-09-17 para los 115 empleados activos con folio que ya existian antes de que este campo
// existiera (112 quedaron con turno real, 3 sin match en SmartControl -- confirmado en vivo).
async function getFolioTurnoMap(pool, employeeNumbers) {
  const map = new Map()
  if (!employeeNumbers.length) return map
  const request = pool.request()
  const placeholders = employeeNumbers.map((n, i) => {
    request.input(`t${i}`, sql.NVarChar, n)
    return `@t${i}`
  })
  const result = await request.query(`
    SELECT uc.EmployeeNumber, ul.Turno
    FROM ADM.UsersComplement uc
    INNER JOIN ADM.UsersLogin ul ON ul.UserId = uc.UserId
    WHERE uc.EmployeeNumber IN (${placeholders.join(', ')})
  `)
  for (const r of result.recordset) map.set(String(r.EmployeeNumber).trim(), mapTurno(r.Turno))
  return map
}

/**
 * Corre el sync real: agrega personal nuevo (folio real, WorkCenterID=49, actividad reciente) y
 * da de baja al que SmartControl ya marca IsActive=0 (folio real, cualquier area). Nunca toca
 * gente sin folio. Devuelve un resumen -- nunca lanza si SmartControl no esta configurado.
 */
export async function runPersonnelSync({ dryRun = false } = {}) {
  if (!isPersonnelSyncConfigured()) {
    return {
      skipped: true,
      reason: 'SmartControl SQL no configurado (faltan env vars).',
      added: [],
      bajas: [],
    }
  }
  const pool = await getPool()
  const now = new Date()

  const allEmployees = await db
    .select({
      id: employeeTable.id,
      employeeNumber: employeeTable.employeeNumber,
      fullName: employeeTable.fullName,
      active: employeeTable.active,
      turno: employeeTable.turno,
    })
    .from(employeeTable)
    .where(isNotNull(employeeTable.employeeNumber))
  const employeeByNumber = new Map(allEmployees.map((e) => [String(e.employeeNumber).trim(), e]))

  // Folios ya representados como User (lideres/supervisores con cuenta de login, ej. "Diego Marin",
  // ver [[project_control_produccion...]] 2026-09-14) -- estos NO deben duplicarse como Employee de
  // piso aunque su folio nunca haya tenido una fila en Employee. Confirmado en vivo 2026-09-14 que
  // sin este chequeo el ALTA automatica volvia a insertar a Diego cada corrida.
  const usersWithNumber = await db
    .select({ employeeNumber: userTable.employeeNumber })
    .from(userTable)
    .where(isNotNull(userTable.employeeNumber))
  const userNumbers = new Set(usersWithNumber.map((u) => String(u.employeeNumber).trim()))

  // 1) ALTA
  const candidates = await getActiveFolioedFftCandidates(pool)
  const added = []
  for (const c of candidates) {
    const number = String(c.EmployeeNumber).trim()
    if (employeeByNumber.has(number)) continue
    if (userNumbers.has(number)) continue
    const fullName = buildFullName(c)
    if (!fullName) continue
    if (dryRun) {
      added.push({ employeeNumber: number, fullName })
      continue
    }
    const [inserted] = await db
      .insert(employeeTable)
      .values({
        employeeNumber: number,
        fullName,
        areaZona: null,
        actividad: c.ActivityNameEs || null,
        fechaIngreso: formatFechaIngreso(c.HireDate),
        active: true,
        turno: mapTurno(c.Turno),
        smartControlSyncedAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: employeeTable.employeeNumber })
      .returning()
    if (inserted) {
      added.push({ employeeNumber: number, fullName })
      employeeByNumber.set(number, inserted)
    }
  }

  // 2) BAJA
  const activeWithNumber = allEmployees.filter((e) => e.active && e.employeeNumber)
  const statusMap = await getFolioActiveStatusMap(
    pool,
    activeWithNumber.map((e) => String(e.employeeNumber).trim()),
  )
  const bajas = []
  for (const e of activeWithNumber) {
    const number = String(e.employeeNumber).trim()
    if (statusMap.get(number) === false) {
      if (!dryRun) {
        await db
          .update(employeeTable)
          .set({
            unassignedReason: 'BAJA',
            unassignedReasonSetAt: now,
            unassignedReasonSetByUserId: null,
            active: false,
            smartControlSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(employeeTable.id, e.id))
      }
      bajas.push({ employeeNumber: number, fullName: e.fullName })
    }
  }

  // 3) Backfill continuo de turno (2026-09-17, ver comentario grande en getFolioTurnoMap): se
  // corre sobre el mismo activeWithNumber de arriba (folios activos ya existentes localmente,
  // sin importar su area) -- UPDATE solo si el valor real de SmartControl difiere del que ya
  // esta guardado, para no generar ruido (fila tocada/updatedAt movido) en cada corrida cuando
  // nada cambio de verdad.
  const turnoMap = await getFolioTurnoMap(
    pool,
    activeWithNumber.map((e) => String(e.employeeNumber).trim()),
  )
  let turnosUpdated = 0
  for (const e of activeWithNumber) {
    const number = String(e.employeeNumber).trim()
    if (!turnoMap.has(number)) continue
    const realTurno = turnoMap.get(number)
    if (realTurno === (e.turno ?? null)) continue
    if (!dryRun) {
      await db
        .update(employeeTable)
        .set({ turno: realTurno, smartControlSyncedAt: now, updatedAt: now })
        .where(eq(employeeTable.id, e.id))
    }
    turnosUpdated += 1
  }

  return { skipped: false, ranAt: now.toISOString(), added, bajas, turnosUpdated }
}
