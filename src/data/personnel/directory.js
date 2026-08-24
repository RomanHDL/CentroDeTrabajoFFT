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

   `eligible` — Actualizado 2026-08-24: ya existe una señal real de baja
   (`status: "BAJA"` en realPersonnelSnapshot.js, 8 personas marcadas
   formalmente a peticion explicita del usuario, ver el header de ese
   archivo). `eligible` ahora es false para cualquiera con
   `status === 'BAJA'`, sin importar `areaZona` (defensivo: hoy esos 8
   siempre tienen `areaZona` null de todos modos, pero la señal
   explicita es la fuente de verdad, no una inferencia). Para todos los
   demas sigue igual que antes: quien no trae zona (ausente/sin
   ubicacion) no es elegible, inferido de `areaZona`. Los empleados
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
  status: p.status === 'BAJA' ? 'BAJA' : 'Activo',
  createdAt: null,
  eligible: p.status === 'BAJA' ? false : p.areaZona != null,
  areaHistorica: p.rawZona || p.areaZona || null,
}))

/* Unica regla de elegibilidad (para busqueda/sugerencias/disponibles):
   eligible=false explicito -> excluido. Cualquier otro caso (incluye
   empleados creados desde la app, que no tienen este campo) -> elegible. */
export function isEmployeeEligible(employee) {
  return employee?.eligible !== false
}
