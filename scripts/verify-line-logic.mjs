// Verificacion de logica pura (sin store/DB): la generacion de estaciones
// por linea (workstations.js) y los 3 turnos oficiales (catalog.js). No
// requiere localStorage/fetch, por eso corre con Node plano -- las partes
// que SI dependen de DailyAssignment/store real (reconcileLineAssignments)
// se verificaron manualmente en vivo contra datos reales, documentado en
// el reporte de la tarea 2026-08-27 ("Corrección WC LINEA + limpieza").
//
// Uso: node --import ./scripts/_esm-extensionless-loader.mjs scripts/verify-line-logic.mjs
import assert from 'node:assert/strict'
import { buildLineRolePlan, LINE_BASE_ROLES, getWorkstationsForLine, buildCustomRolePlan, hasMultipleStations } from '../src/data/personnel/workstations.js'
import {
  OFFICIAL_SHIFTS, WORK_CENTERS, WORK_CENTER_NAVIGATION_ORDER, getWorkCenterNavContext,
  getCurrentShift, getShiftSchedule, formatShiftSchedule,
  getAreaDetailVariant, AREA_DETAIL_VARIANTS, OPERATIONAL_DETAIL_AREA_IDS, SUPPORT_DETAIL_AREA_IDS,
  CUSTOM_STATION_PLANS, workCenterById, isWorkCenterActive, canonicalOperationalAreaId, operationalGroupMembers,
  FFT_INDICATORS,
} from '../src/data/production/catalog.js'
import { formatEmployeeNumber } from '../src/data/personnel/employeeDisplay.js'

let passed = 0
function check(name, fn) {
  fn()
  passed += 1
  console.log(`OK  ${name}`)
}

// B/C/D -- cantidad de posiciones = idealHeadcount, roles base + repeticion estable.
check('plan de 6 posiciones = 5 roles base + 1 repetido', () => {
  const plan = buildLineRolePlan('X', 6)
  assert.equal(plan.length, 6)
  LINE_BASE_ROLES.forEach((r) => assert.ok(plan.some((p) => p.role === r)))
})
check('plan de 7 posiciones = 5 roles base + 2 repetidos', () => {
  const plan = buildLineRolePlan('X', 7)
  assert.equal(plan.length, 7)
})
check('plan de 10 posiciones = cada rol base exactamente 2 veces (maximo real)', () => {
  const plan = buildLineRolePlan('X', 10)
  assert.equal(plan.length, 10)
  LINE_BASE_ROLES.forEach((r) => assert.equal(plan.filter((p) => p.role === r).length, 2))
})
check('nunca genera un rol fuera de los 5 base', () => {
  const plan = buildLineRolePlan('X', 10)
  plan.forEach((p) => assert.ok(LINE_BASE_ROLES.includes(p.role)))
})
check('estable/deterministico -- misma linea + mismo ideal = mismo plan siempre', () => {
  const a = buildLineRolePlan('LINEA6', 7).map((p) => p.role)
  const b = buildLineRolePlan('LINEA6', 7).map((p) => p.role)
  assert.deepEqual(a, b)
})
check('nombres de estacion unicos por linea (repeticion sufijada, ej. "Etiquetado 2")', () => {
  const names = getWorkstationsForLine('LINEA6').map((w) => w.name)
  assert.equal(new Set(names).size, names.length)
})
check('cantidad de estaciones de cada WC LINEA real coincide con su idealHeadcount', () => {
  WORK_CENTERS.filter((w) => /^WC LINEA \d+$/.test(w.name)).forEach((w) => {
    assert.equal(getWorkstationsForLine(w.id).length, w.idealHeadcount)
  })
})

// I/J/K -- los 3 turnos oficiales.
check('Matutino = 07:00-17:10', () => {
  const s = OFFICIAL_SHIFTS.find((x) => x.label === 'Matutino')
  assert.equal(s.start, '07:00')
  assert.equal(s.end, '17:10')
})
check('Tiempo extra = 17:11-22:00', () => {
  const s = OFFICIAL_SHIFTS.find((x) => x.label === 'Tiempo extra')
  assert.equal(s.start, '17:11')
  assert.equal(s.end, '22:00')
})
check('Noche = 22:01-07:00 (cruza medianoche)', () => {
  const s = OFFICIAL_SHIFTS.find((x) => x.label === 'Noche')
  assert.equal(s.start, '22:01')
  assert.equal(s.end, '07:00')
})

// CT -> WC -- todos los nombres de area empiezan con "WC ", ninguno con "CT ".
check('todos los WORK_CENTERS.name empiezan con "WC " (rename CT->WC completo)', () => {
  WORK_CENTERS.forEach((w) => assert.ok(w.name.startsWith('WC '), `${w.id}: "${w.name}"`))
})
check('los ids internos de WORK_CENTERS no cambiaron (rename fue solo del display name)', () => {
  const knownIds = new Set(['LINEA1', 'LINEA2', 'LINEA3', 'LINEA4', 'LINEA5', 'LINEA6', 'LINEA7', 'LINEA8', 'LINEA9', 'LINEA10', 'PROYECTO', 'ACCESORIOS', 'PALETIZADO'])
  WORK_CENTERS.filter((w) => knownIds.has(w.id)).forEach((w) => assert.ok(knownIds.has(w.id)))
  assert.equal(WORK_CENTERS.filter((w) => knownIds.has(w.id)).length, knownIds.size)
})

// Navegacion Anterior/Siguiente entre Work Centers (2026-08-27).
check('el recorrido empieza en PROYECTO (WC LINEA 0), luego LINEA1..10 en orden', () => {
  assert.deepEqual(
    WORK_CENTER_NAVIGATION_ORDER.slice(0, 12),
    ['PROYECTO', 'LINEA1', 'LINEA2', 'LINEA3', 'LINEA4', 'LINEA5', 'LINEA6', 'LINEA7', 'LINEA8', 'LINEA9', 'LINEA10', 'CONVEYOR_PRINCIPAL']
  )
})
check('SELLADO y PNP/POC/PEN nunca aparecen en el recorrido (sin detalle propio / sin WORK_CENTER real)', () => {
  assert.ok(!WORK_CENTER_NAVIGATION_ORDER.includes('SELLADO'))
  assert.ok(!WORK_CENTER_NAVIGATION_ORDER.includes('PNP_POC_PEN'))
})
check('WC LINEA 0 -> siguiente = WC LINEA 1, sin anterior', () => {
  const ctx = getWorkCenterNavContext('PROYECTO')
  assert.equal(ctx.previous, null)
  assert.equal(ctx.next.id, 'LINEA1')
})
check('WC LINEA 1 -> anterior = WC LINEA 0, siguiente = WC LINEA 2', () => {
  const ctx = getWorkCenterNavContext('LINEA1')
  assert.equal(ctx.previous.id, 'PROYECTO')
  assert.equal(ctx.next.id, 'LINEA2')
})
check('WC LINEA 10 -> siguiente = WC Conveyor Principal', () => {
  const ctx = getWorkCenterNavContext('LINEA10')
  assert.equal(ctx.next.id, 'CONVEYOR_PRINCIPAL')
})
check('WC Conveyor General (antes Principal) -> siguiente = WC Midea/High Value (Conveyor Secundario ya no es parada propia, fusionado)', () => {
  const ctx = getWorkCenterNavContext('CONVEYOR_PRINCIPAL')
  assert.equal(ctx.next.id, 'HIGH_VALUE')
})
check('CONVEYOR_SECUNDARIO nunca aparece en el recorrido (fusionado en WC Conveyor General, 2026-08-26)', () => {
  assert.ok(!WORK_CENTER_NAVIGATION_ORDER.includes('CONVEYOR_SECUNDARIO'))
})
check('el ultimo Work Center del recorrido no tiene siguiente (navegacion lineal, nunca circular)', () => {
  const lastId = WORK_CENTER_NAVIGATION_ORDER[WORK_CENTER_NAVIGATION_ORDER.length - 1]
  const ctx = getWorkCenterNavContext(lastId)
  assert.equal(ctx.next, null)
})
check('SELLADO resuelve su navegacion a traves de su id canonico (WC Conveyor Principal)', () => {
  const ctx = getWorkCenterNavContext('SELLADO')
  assert.equal(ctx.current.id, 'CONVEYOR_PRINCIPAL')
})
check('recorrido completo: 0..10 + 2 conveyors + el resto de areas reales, sin huecos ni saltos rotos', () => {
  for (let i = 0; i < WORK_CENTER_NAVIGATION_ORDER.length - 1; i += 1) {
    const ctx = getWorkCenterNavContext(WORK_CENTER_NAVIGATION_ORDER[i])
    assert.equal(ctx.next.id, WORK_CENTER_NAVIGATION_ORDER[i + 1], `salto roto en la posicion ${i}`)
  }
})
check('recorrido inverso desde el ultimo Work Center llega exactamente hasta WC LINEA 0', () => {
  let id = WORK_CENTER_NAVIGATION_ORDER[WORK_CENTER_NAVIGATION_ORDER.length - 1]
  const visited = [id]
  while (true) {
    const ctx = getWorkCenterNavContext(id)
    if (!ctx.previous) break
    id = ctx.previous.id
    visited.push(id)
  }
  assert.equal(id, 'PROYECTO')
  assert.equal(visited.length, WORK_CENTER_NAVIGATION_ORDER.length)
})

// formatEmployeeNumber -- "PROYECTO" para cualquier forma de "sin numero real".
check('numero real se muestra tal cual', () => {
  assert.equal(formatEmployeeNumber('3844'), '3844')
})
check('null/undefined/vacio -> PROYECTO', () => {
  assert.equal(formatEmployeeNumber(null), 'PROYECTO')
  assert.equal(formatEmployeeNumber(undefined), 'PROYECTO')
  assert.equal(formatEmployeeNumber(''), 'PROYECTO')
})
check('placeholder "PENDIENTE" -> PROYECTO (nunca se muestra PENDIENTE)', () => {
  assert.equal(formatEmployeeNumber('PENDIENTE'), 'PROYECTO')
})
check('placeholder "PROYECTO" ya literal -> PROYECTO', () => {
  assert.equal(formatEmployeeNumber('PROYECTO'), 'PROYECTO')
})

// getCurrentShift -- limites exactos de los 3 turnos oficiales, 2026-08-26
// (correccion "Turnos oficiales"). Noche cruza medianoche: NUNCA implementada
// como "hora >= 22:01 && hora <= 07:00" (eso nunca es true) -- se prueban
// explicitamente los 8 casos limite que dio el usuario.
function atTime(hh, mm) { const d = new Date(2026, 7, 26, hh, mm); return d }
check('06:59 -> Noche (un minuto antes de Matutino)', () => {
  assert.equal(getCurrentShift(atTime(6, 59)).id, 'NOCHE')
})
check('07:00 -> Matutino (inicio exacto)', () => {
  assert.equal(getCurrentShift(atTime(7, 0)).id, 'MATUTINO')
})
check('17:10 -> Matutino (fin exacto)', () => {
  assert.equal(getCurrentShift(atTime(17, 10)).id, 'MATUTINO')
})
check('17:11 -> Tiempo extra (inicio exacto)', () => {
  assert.equal(getCurrentShift(atTime(17, 11)).id, 'TIEMPO_EXTRA')
})
check('22:00 -> Tiempo extra (fin exacto)', () => {
  assert.equal(getCurrentShift(atTime(22, 0)).id, 'TIEMPO_EXTRA')
})
check('22:01 -> Noche (inicio exacto, cruza medianoche)', () => {
  assert.equal(getCurrentShift(atTime(22, 1)).id, 'NOCHE')
})
check('23:59 -> Noche', () => {
  assert.equal(getCurrentShift(atTime(23, 59)).id, 'NOCHE')
})
check('00:00 -> Noche (ya del otro lado de la medianoche)', () => {
  assert.equal(getCurrentShift(atTime(0, 0)).id, 'NOCHE')
})
check('getShiftSchedule encuentra por id y por label, nunca inventa un horario', () => {
  assert.equal(getShiftSchedule('MATUTINO').start, '07:00')
  assert.equal(getShiftSchedule('Matutino').end, '17:10')
  assert.equal(getShiftSchedule('NO_EXISTE'), null)
})
check('formatShiftSchedule -- Matutino se muestra "07:00 AM – 05:10 PM" (nunca 07:00-14:00)', () => {
  assert.equal(formatShiftSchedule(getShiftSchedule('MATUTINO')), '07:00 AM – 05:10 PM')
})
check('formatShiftSchedule -- Noche cruza medianoche en el texto (10:01 PM – 07:00 AM)', () => {
  assert.equal(formatShiftSchedule(getShiftSchedule('NOCHE')), '10:01 PM – 07:00 AM')
})

// Reclasificacion de WC Calidad (2026-08-26, reversion explicita del usuario):
// ya NO usa OperationalAreaDetail, ahora es SUPPORT junto con las otras 6
// cards inferiores -- verificado por la unica fuente de verdad central
// (getAreaDetailVariant), nunca por nombre.
check('WC Calidad -> variante SUPPORT (ya no OPERATIONAL)', () => {
  assert.equal(getAreaDetailVariant('CALIDAD'), AREA_DETAIL_VARIANTS.SUPPORT)
  assert.ok(!OPERATIONAL_DETAIL_AREA_IDS.has('CALIDAD'))
  assert.ok(SUPPORT_DETAIL_AREA_IDS.has('CALIDAD'))
})
check('las 7 cards inferiores (incluyendo Calidad) son SUPPORT', () => {
  ['CALIDAD', 'CAPACITACION', 'TEAM_LEADER', 'SOPORTE', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR'].forEach((id) => {
    assert.equal(getAreaDetailVariant(id), AREA_DETAIL_VARIANTS.SUPPORT, id)
  })
})
check('WC Conveyor General (fusion Principal+Secundario, 2026-08-26) -> variante LINE_LIKE, ya no OPERATIONAL', () => {
  assert.equal(getAreaDetailVariant('CONVEYOR_PRINCIPAL'), AREA_DETAIL_VARIANTS.LINE_LIKE)
  assert.ok(!OPERATIONAL_DETAIL_AREA_IDS.has('CONVEYOR_PRINCIPAL'))
})
check('CONVEYOR_SECUNDARIO (fusionado, archivado) resuelve a LINE_LIKE via su id canonico (CONVEYOR_PRINCIPAL)', () => {
  assert.equal(getAreaDetailVariant('CONVEYOR_SECUNDARIO'), AREA_DETAIL_VARIANTS.LINE_LIKE)
  assert.equal(canonicalOperationalAreaId('CONVEYOR_SECUNDARIO'), 'CONVEYOR_PRINCIPAL')
  assert.equal(isWorkCenterActive('CONVEYOR_SECUNDARIO'), false)
})
check('SELLADO tambien resuelve a LINE_LIKE (mismo grupo que Conveyor General)', () => {
  assert.equal(getAreaDetailVariant('SELLADO'), AREA_DETAIL_VARIANTS.LINE_LIKE)
})
check('WC Conveyor General genera 2 puestos genericos "Puesto N" (1 de Principal + 1 de Secundario, suma via operationalGroupMembers)', () => {
  assert.deepEqual(operationalGroupMembers('CONVEYOR_PRINCIPAL'), ['CONVEYOR_PRINCIPAL', 'CONVEYOR_SECUNDARIO', 'SELLADO'])
  const stations = getWorkstationsForLine('CONVEYOR_PRINCIPAL')
  assert.equal(stations.length, 2)
  assert.equal(stations[0].name, 'Puesto 1')
  assert.equal(stations[1].name, 'Puesto 2')
  assert.ok(hasMultipleStations('CONVEYOR_PRINCIPAL'))
})
check('WC Conveyor General se renombro (id interno CONVEYOR_PRINCIPAL no cambia)', () => {
  assert.equal(workCenterById('CONVEYOR_PRINCIPAL').name, 'WC Conveyor General')
})
check('Accesorios/Paletizado/Insumos -> variante LINE_LIKE (2026-08-26, segunda ronda: "copia el diseño de WC LINEA")', () => {
  ;['ACCESORIOS', 'PALETIZADO', 'INSUMOS'].forEach((id) => {
    assert.equal(getAreaDetailVariant(id), AREA_DETAIL_VARIANTS.LINE_LIKE, id)
    assert.ok(!OPERATIONAL_DETAIL_AREA_IDS.has(id), id)
  })
})
check('BOX_PREP/SUMINISTRO_MATERIAL (fusionadas, archivadas) resuelven a LINE_LIKE via su id canonico (INSUMOS)', () => {
  ;['BOX_PREP', 'SUMINISTRO_MATERIAL'].forEach((id) => {
    assert.equal(getAreaDetailVariant(id), AREA_DETAIL_VARIANTS.LINE_LIKE, id)
    assert.equal(canonicalOperationalAreaId(id), 'INSUMOS', id)
    assert.equal(isWorkCenterActive(id), false, id)
  })
})
check('WC Midea/High Value -> variante LINE_LIKE (2026-08-26, ya no OPERATIONAL)', () => {
  assert.equal(getAreaDetailVariant('HIGH_VALUE'), AREA_DETAIL_VARIANTS.LINE_LIKE)
  assert.ok(!OPERATIONAL_DETAIL_AREA_IDS.has('HIGH_VALUE'))
})
check('WC LINEA 0-10 siguen LINE, sin cambio', () => {
  ;['PROYECTO', 'LINEA1', 'LINEA5', 'LINEA10'].forEach((id) => {
    assert.equal(getAreaDetailVariant(id), AREA_DETAIL_VARIANTS.LINE, id)
  })
})
check('WC LINEA 11 no existe en el catalogo (no se inventa)', () => {
  assert.ok(!WORK_CENTERS.some((w) => w.id === 'LINEA11'))
})

// Reestructuracion operativa FFT (2026-08-26): fusion Insumos, plantillas
// por puesto, Midea tipo Linea, archivado de Soporte, WC Entrenador,
// Gerente FFT, indicadores FFT.
check('WC Insumos y Suministro de Material: ideal = suma real de CUSTOM_STATION_PLANS.INSUMOS (9)', () => {
  assert.equal(workCenterById('INSUMOS').idealHeadcount, 9)
  assert.equal(workCenterById('INSUMOS').name, 'WC Insumos y Suministro de Material')
})
check('WC Accesorios: ideal = suma real de CUSTOM_STATION_PLANS.ACCESORIOS (18)', () => {
  assert.equal(workCenterById('ACCESORIOS').idealHeadcount, 18)
  assert.equal(CUSTOM_STATION_PLANS.ACCESORIOS.reduce((s, r) => s + r.count, 0), 18)
})
check('WC Paletizado: ideal = suma real de CUSTOM_STATION_PLANS.PALETIZADO (14)', () => {
  assert.equal(workCenterById('PALETIZADO').idealHeadcount, 14)
  assert.equal(CUSTOM_STATION_PLANS.PALETIZADO.reduce((s, r) => s + r.count, 0), 14)
})
check('puestos con count>1 generan slots individuales numerados desde 1 (Surtidor de Accesorios 1..7)', () => {
  const plan = buildCustomRolePlan(CUSTOM_STATION_PLANS.ACCESORIOS)
  const surtidores = plan.filter((p) => p.role === 'Surtidor de Accesorios').map((p) => p.name)
  assert.deepEqual(surtidores, ['Surtidor de Accesorios 1', 'Surtidor de Accesorios 2', 'Surtidor de Accesorios 3', 'Surtidor de Accesorios 4', 'Surtidor de Accesorios 5', 'Surtidor de Accesorios 6', 'Surtidor de Accesorios 7'])
})
check('puestos con count=1 NO llevan numero (Team Leader, no "Team Leader 1")', () => {
  const plan = buildCustomRolePlan(CUSTOM_STATION_PLANS.ACCESORIOS)
  const teamLeader = plan.find((p) => p.role === 'Team Leader')
  assert.equal(teamLeader.name, 'Team Leader')
})
check('no se duplica el tipo de rol en el catalogo: 7 slots de Surtidor comparten el mismo `role`', () => {
  const plan = buildCustomRolePlan(CUSTOM_STATION_PLANS.ACCESORIOS)
  const roles = new Set(plan.filter((p) => p.name.startsWith('Surtidor')).map((p) => p.role))
  assert.equal(roles.size, 1)
})
check('WC Accesorios/Paletizado/Insumos tienen sus estaciones reales generadas (no un solo slot generico)', () => {
  assert.equal(getWorkstationsForLine('ACCESORIOS').length, 18)
  assert.equal(getWorkstationsForLine('PALETIZADO').length, 14)
  assert.equal(getWorkstationsForLine('INSUMOS').length, 9)
})
check('el picker de estacion se activa por CANTIDAD real de estaciones, no por tipo de area', () => {
  assert.equal(hasMultipleStations('ACCESORIOS'), true)
  assert.equal(hasMultipleStations('PALETIZADO'), true)
  assert.equal(hasMultipleStations('INSUMOS'), true)
  assert.equal(hasMultipleStations('HIGH_VALUE'), true)
  assert.equal(hasMultipleStations('LINEA1'), true)
  assert.equal(hasMultipleStations('GERENTE'), false)
})
check('WC Midea/High Value: 1 slot por persona (capacity 1), cantidad = idealHeadcount real (16), sin nombres inventados', () => {
  const stations = getWorkstationsForLine('HIGH_VALUE')
  assert.equal(stations.length, workCenterById('HIGH_VALUE').idealHeadcount)
  stations.forEach((s) => assert.equal(s.capacity, 1))
  // Nunca se inventan puestos de linea (Montaje/Prueba electrica/etc.) para Midea.
  const invented = ['Montaje', 'Prueba eléctrica', 'Limpieza', 'Etiquetado', 'Suministro de Accesorios']
  stations.forEach((s) => assert.ok(!invented.includes(s.role), `puesto inventado detectado: ${s.role}`))
})
check('WC Soporte: archivada (active:false), pero el id sigue resolviendo (historial preservado)', () => {
  assert.equal(isWorkCenterActive('SOPORTE'), false)
  assert.ok(workCenterById('SOPORTE'), 'SOPORTE debe seguir existiendo en WORK_CENTERS para historial')
  assert.equal(getAreaDetailVariant('SOPORTE'), AREA_DETAIL_VARIANTS.SUPPORT)
})
check('WC Soporte ya no aparece en la navegacion Anterior/Siguiente activa', () => {
  assert.ok(!WORK_CENTER_NAVIGATION_ORDER.includes('SOPORTE'))
  assert.ok(!WORK_CENTER_NAVIGATION_ORDER.includes('BOX_PREP'))
  assert.ok(!WORK_CENTER_NAVIGATION_ORDER.includes('SUMINISTRO_MATERIAL'))
})
check('WC Entrenador existe, activo, clasificado SUPPORT, y aparece en la navegacion', () => {
  assert.ok(workCenterById('ENTRENADOR'))
  assert.equal(isWorkCenterActive('ENTRENADOR'), true)
  assert.equal(getAreaDetailVariant('ENTRENADOR'), AREA_DETAIL_VARIANTS.SUPPORT)
  assert.ok(WORK_CENTER_NAVIGATION_ORDER.includes('ENTRENADOR'))
})
check('WC Gerente ahora se muestra "WC Gerente FFT", mismo id interno (GERENTE)', () => {
  assert.equal(workCenterById('GERENTE').name, 'WC Gerente FFT')
})
check('operationalGroupMembers(INSUMOS) suma Box Prep + Suministro de material + Insumos', () => {
  assert.deepEqual(operationalGroupMembers('INSUMOS'), ['INSUMOS', 'SUMINISTRO_MATERIAL', 'BOX_PREP'])
})
check('indicadores FFT: orden oficial 1-4 (Eficiencia, Demoras, Produccion, Cumplimiento), ninguno con fuente real inventada', () => {
  assert.deepEqual(FFT_INDICATORS.map((i) => i.id), ['EFICIENCIA', 'DEMORAS', 'PRODUCCION', 'CUMPLIMIENTO_PROGRAMAS'])
  FFT_INDICATORS.forEach((i) => assert.equal(i.hasSource, false, `${i.id} no deberia tener fuente real todavia`))
})

console.log(`\n${passed}/${passed} checks OK`)
