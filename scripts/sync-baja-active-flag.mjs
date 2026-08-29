// Sincroniza Employee.active=false para las personas marcadas "status": "BAJA" en
// src/data/production/realPersonnelSnapshot.js (snapshot BASE/SEM 34, fijado 2026-08-24) que
// tengan un employeeNumber REAL -- ese campo es lo unico que permite emparejarlas contra la fila
// real de Employee en Postgres sin ambiguedad. NO inventa employeeNumber para las personas del
// snapshot que solo tienen nombre (esas se reportan como omitidas, no se tocan).
//
// Corre UNA vez (mismo estilo que seed-role-module-access.mjs) para activar el bloqueo real de
// BAJA en checkin/move/approve-move (ver server-lib/personnel.js, placeEmployee). Es seguro
// volver a correrlo despues (upsert idempotente vía update simple, no falla si ya esta en
// active=false).
import { eq } from 'drizzle-orm'
import { db, employee } from '../server-lib/db/client.js'

// Copiados a mano de realPersonnelSnapshot.js (grep de "status": "BAJA" con employeeNumber
// presente) -- NO son un numero inventado, son los 5 de los 10 registros BAJA del snapshot que
// SI tienen employeeNumber real. Los otros 5 (Ramiro Aguilar Rubio, Daniela, Valentin Cruz
// Martinez, Kevin Alejandro Cira Ramirez, Javier Aguilar De Dios) solo tienen nombre en el
// snapshot -- emparejarlos por nombre seria ambiguo/inseguro, se omiten a proposito.
const BAJA_EMPLOYEE_NUMBERS = ['3591', '3276', '3924', '3625', '3402']

let updated = 0
let alreadyInactive = 0
let notFound = 0

for (const employeeNumber of BAJA_EMPLOYEE_NUMBERS) {
  const [emp] = await db
    .select()
    .from(employee)
    .where(eq(employee.employeeNumber, employeeNumber))
    .limit(1)
  if (!emp) {
    console.log(`OMITIDO ${employeeNumber} -- no existe todavia como Employee en la base real.`)
    notFound += 1
    continue
  }
  if (!emp.active) {
    console.log(`YA INACTIVO ${employeeNumber} -- ${emp.fullName}`)
    alreadyInactive += 1
    continue
  }
  await db
    .update(employee)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(employee.employeeNumber, employeeNumber))
  console.log(`ACTUALIZADO ${employeeNumber} -- ${emp.fullName} -> active=false`)
  updated += 1
}

console.log(
  `\nResumen: ${updated} actualizados, ${alreadyInactive} ya estaban inactivos, ${notFound} no encontrados.`,
)
await db.$client.end()
