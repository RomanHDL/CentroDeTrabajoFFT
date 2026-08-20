/* ─────────────────────────────────────────────
   Directorio base de empleados (catalogo tipo "RH"), usado por
   busqueda/autocompletado (Registrar personal, Autoasignarme).

   Antes traia 36 nombres inventados. Ahora viene del snapshot
   REAL (realPersonnelSnapshot.js) — mismo dato que alimenta el
   plano visual de areas. El snapshot base (BASE, LAYOUT FFT.xlsx)
   no trae numero de empleado ni fecha de ingreso; esos datos
   llegaron despues desde "ASISTENCIA FFT SEM 34.xlsx" cruzando por
   nombre + area, SOLO donde la coincidencia fue inequivoca (ver
   `employeeNumber`/`fechaIngreso` en realPersonnelSnapshot.js).
   Quien no tenga `employeeNumber` confirmado todavia -> 'PENDIENTE'.
   Quien no tenga `fechaIngreso` -> null (no se inventa).

   `eligible` — HOY el sistema NO tiene ninguna hoja BAJAS
   importada (ni en JS ni en Prisma/Neon: ese modelo existe pero
   no tiene ninguna fila real ni API conectada). El unico dato
   real disponible es `areaZona`: quien no trae zona (ausente/sin
   ubicacion, o marcado explicitamente como baja por el usuario) no
   es elegible. Por eso `eligible` se calcula desde ese campo
   EXISTENTE (nunca una lista de nombres escrita a mano): si el dia
   de manana se importa la hoja BAJAS real, este campo debe pasar a
   leerse de ahi en vez de inferirse de areaZona. Los empleados
   creados dinamicamente (no vienen del snapshot) no tienen esta
   propiedad — se tratan como elegibles por defecto (ver
   isEmployeeEligible). Personal que solo existe en SEM 34 (ids
   "sem34-N", sin fila en BASE) recibe una areaZona en texto libre
   (p. ej. "PRODUCCION", "CHOFER") cuando SEM 34 no da una linea/area
   especifica o el area todavia no existe en catalog.js — quedan
   elegibles y buscables aqui, pero no aparecen en el layout visual. */
import { REAL_PERSONNEL_SNAPSHOT } from '../production/realPersonnelSnapshot'

export const EMPLOYEE_DIRECTORY = REAL_PERSONNEL_SNAPSHOT.map((p) => ({
  id: p.id,
  employeeNumber: p.employeeNumber || 'PENDIENTE',
  name: p.name,
  fechaIngreso: p.fechaIngreso || null,
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
