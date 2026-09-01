// Fix real (Postgres) -- 2026-09-01. Bug REPORTADO por el usuario viendo el
// Preview en vivo: LINEA3, LINEA4 y LINEA5 mostraban 7 puestos en vez de 8.
//
// Investigacion (ver reporte de esta tarea): NO es un efecto del alta de
// "Limpieza de caja" -- es un dato viejo suelto, previo a este cambio: las 3
// lineas ya tenian una fila "Empaque" (role=Empaque, displayOrder=8)
// guardada con active=false desde antes, y el generador/seed-personnel.mjs
// nunca toca la columna `active` (solo inserta/actualiza el resto de
// campos), asi que esa fila se quedo inactiva indefinidamente. WC LINEA 0,
// 1, 2, 6, 7, 8, 9 y 10 SI tienen su Empaque activo -- verificado contra la
// base real antes de este fix, no se tocan.
//
// IDEMPOTENTE: si ya esta activo, no hace nada.
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/fix-empaque-inactivo-linea345-2026-09-01.mjs
import { and, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

async function activate(areaCode, name) {
  const [wa] = await db.select().from(workArea).where(eq(workArea.code, areaCode)).limit(1)
  if (!wa) {
    console.log(`  (omitido) WorkArea "${areaCode}" no existe`)
    return
  }
  const [w] = await db
    .select()
    .from(workstation)
    .where(and(eq(workstation.workAreaId, wa.id), eq(workstation.name, name)))
    .limit(1)
  if (!w) {
    console.log(`  (omitido) ${areaCode}: "${name}" no existe`)
    return
  }
  if (w.active) {
    console.log(`  OK (ya activo) ${areaCode}: "${name}"`)
    return
  }
  await db.update(workstation).set({ active: true }).where(eq(workstation.id, w.id))
  console.log(`  ACTIVADO ${areaCode}: "${name}"`)
}

for (const areaCode of ['LINEA3', 'LINEA4', 'LINEA5']) {
  await activate(areaCode, 'Empaque')
}

console.log('\nListo.')
await db.$client.end()
