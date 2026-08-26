/* ─────────────────────────────────────────────
   Como mostrar el numero de empleado -- 2026-08-28, a peticion
   explicita del usuario, dentro del detalle de WC LINEA (Personal
   disponible, detalle de empleado, tabla de personal asignado, modal
   de asignacion de estacion).

   Un empleado real puede no tener numero confirmado todavia (persona
   de Proyecto, o SEM 34 sin numero cruzado) -- el sistema ya usa dos
   placeholders equivalentes segun el origen del dato ('PENDIENTE' en
   directory.js/EMPLOYEE_DIRECTORY, 'PROYECTO' en repository.js/
   SHARED_PLACEHOLDER_NUMBERS), ademas de employeeNumber genuinamente
   null/undefined para empleados creados dinamicamente sin numero. Los
   tres casos son la MISMA situacion real ("no tiene numero todavia"),
   nunca un bot ni una baja -- se muestran todos como "PROYECTO" en vez
   de "PENDIENTE"/"—"/null, nunca un numero inventado. */
const NUMBER_PLACEHOLDERS = new Set(['PENDIENTE', 'PROYECTO'])

export function formatEmployeeNumber(employeeNumber) {
  if (!employeeNumber || NUMBER_PLACEHOLDERS.has(employeeNumber)) return 'PROYECTO'
  return employeeNumber
}
