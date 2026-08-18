/* Bandera configurable de validacion de habilidades para la
   AUTOASIGNACION. Mientras no exista una matriz de
   capacitacion oficial confirmada por el negocio, se deja en
   false: se muestra advertencia pero no se bloquea de forma
   absoluta (evita inventar una regla empresarial que nadie
   ha confirmado). La asignacion hecha por un supervisor
   nunca se bloquea por habilidad — el supervisor puede
   decidir con criterio propio. */
export const STRICT_SKILL_VALIDATION = false
