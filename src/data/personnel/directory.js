/* ─────────────────────────────────────────────
   Directorio base de empleados (catalogo tipo "RH"), usado por
   busqueda/autocompletado (Registrar personal, Autoasignarme).

   Antes traia 36 nombres inventados. Ahora viene del snapshot
   REAL de BASE (LAYOUT FFT.xlsx) — mismo dato que alimenta el
   plano visual de areas. BASE no trae numero de empleado; ese dato
   llego despues (2026-08-19) desde "ASISTENCIA FFT SEM 34.xlsx"
   (hoja de la semana 34, la unica usada — ver `employeeNumber` en
   realPersonnelSnapshot.js) cruzando por nombre + area, SOLO donde
   la coincidencia fue inequivoca. Quien no tenga `employeeNumber`
   en el snapshot todavia no tiene numero confirmado -> 'PENDIENTE'.

   `eligible` — HOY el sistema NO tiene ninguna hoja BAJAS
   importada (ni en JS ni en Prisma/Neon: ese modelo existe pero
   no tiene ninguna fila real ni API conectada). El unico dato
   real disponible en BASE es `areaZona`: 26 de las 116 personas
   no traen zona (ausentes/sin ubicacion el dia del snapshot). El
   usuario confirmo que esas 26 personas ya no trabajan en la
   empresa. Por eso `eligible` se calcula desde ese campo EXISTENTE
   (nunca una lista de nombres escrita a mano): si el dia de manana
   se importa la hoja BAJAS real, este campo debe pasar a leerse de
   ahi en vez de inferirse de areaZona. Los empleados creados
   dinamicamente (no vienen de BASE) no tienen esta propiedad —
   se tratan como elegibles por defecto (ver isEmployeeEligible). */
import { REAL_PERSONNEL_SNAPSHOT } from '../production/realPersonnelSnapshot'

export const EMPLOYEE_DIRECTORY = REAL_PERSONNEL_SNAPSHOT.map((p) => ({
  id: p.id,
  employeeNumber: p.employeeNumber || 'PENDIENTE',
  name: p.name,
  status: 'Activo',
  createdAt: null,
  eligible: p.areaZona != null,
}))

/* Unica regla de elegibilidad (para busqueda/sugerencias/disponibles):
   eligible=false explicito -> excluido. Cualquier otro caso (incluye
   empleados creados desde la app, que no tienen este campo) -> elegible. */
export function isEmployeeEligible(employee) {
  return employee?.eligible !== false
}
