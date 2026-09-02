// Corrige un dato real incorrecto: Jonhatan Alfredo Gomez Trujillo (#3402, base-107 en
// realPersonnelSnapshot.js) se habia marcado BAJA el 2026-08-24 con evidencia del Excel de RH
// de esa fecha (codigo "Cambio" los 3 dias reportados). El usuario confirmo explicitamente hoy
// (2026-09-02) que es un ERROR: es lider activo, turno de noche -- "el lider Jhonatan... el no
// esta de baja". La situacion de HR cambio desde el 24/08 (o la lectura de "Cambio" del Excel
// nunca significo baja real para el) -- se revierte active=false -> true en la fila real de
// Employee (Postgres), espejo exacto de scripts/sync-baja-active-flag.mjs pero en reversa, para
// UNA sola persona. Corre una sola vez; seguro volver a correrlo (no falla si ya esta active).
import { eq } from 'drizzle-orm'
import { db, employee } from '../server-lib/db/client.js'

const EMPLOYEE_NUMBER = '3402'

const [emp] = await db
  .select()
  .from(employee)
  .where(eq(employee.employeeNumber, EMPLOYEE_NUMBER))
  .limit(1)

if (!emp) {
  console.log(`OMITIDO ${EMPLOYEE_NUMBER} -- no existe como Employee en la base real.`)
} else if (emp.active) {
  console.log(`YA ACTIVO ${EMPLOYEE_NUMBER} -- ${emp.fullName}, nada que hacer.`)
} else {
  const [updated] = await db
    .update(employee)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(employee.employeeNumber, EMPLOYEE_NUMBER))
    .returning()
  console.log(`REACTIVADO ${EMPLOYEE_NUMBER} -- ${updated.fullName} -> active=true`)
}

await db.$client.end()
