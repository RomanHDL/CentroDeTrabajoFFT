// Verificacion de logica pura (sin store/DB): la generacion de estaciones
// por linea (workstations.js) y los 3 turnos oficiales (catalog.js). No
// requiere localStorage/fetch, por eso corre con Node plano -- las partes
// que SI dependen de DailyAssignment/store real (reconcileLineAssignments)
// se verificaron manualmente en vivo contra datos reales, documentado en
// el reporte de la tarea 2026-08-27 ("Corrección WC LINEA + limpieza").
//
// Uso: node --import ./scripts/_esm-extensionless-loader.mjs scripts/verify-line-logic.mjs
import assert from 'node:assert/strict'
import { buildLineRolePlan, LINE_BASE_ROLES, getWorkstationsForLine } from '../src/data/personnel/workstations.js'
import { OFFICIAL_SHIFTS, WORK_CENTERS } from '../src/data/production/catalog.js'

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

console.log(`\n${passed}/${passed} checks OK`)
