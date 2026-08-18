/* ─────────────────────────────────────────────
   Directorio base de empleados (catalogo tipo "RH"), usado por
   busqueda/autocompletado (Registrar personal, Autoasignarme).

   Antes traia 36 nombres inventados. Ahora viene del snapshot
   REAL de BASE (LAYOUT FFT.xlsx) — mismo dato que alimenta el
   plano visual de areas. Ninguno tiene employeeNumber real
   porque BASE no trae esa columna: se muestra 'PENDIENTE' y el
   numero real llegara con la importacion formal (Etapa 2).
   ───────────────────────────────────────────── */

import { REAL_PERSONNEL_SNAPSHOT } from '../production/realPersonnelSnapshot'

export const EMPLOYEE_DIRECTORY = REAL_PERSONNEL_SNAPSHOT.map((p) => ({
  id: p.id,
  employeeNumber: 'PENDIENTE',
  name: p.name,
  status: 'Activo',
  createdAt: null,
}))
