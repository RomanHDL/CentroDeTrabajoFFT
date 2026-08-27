/* ─────────────────────────────────────────────
   Jerarquia visual por rango (2026-08-27, "CAMBIO DEFINITIVO — PERSONAL
   + IDENTIDAD VISUAL POR ÁREA, PUESTO Y RANGO", a peticion explicita del
   usuario). Aplica UNICAMENTE a las areas LINE_LIKE (Familia C: Paletizado,
   Accesorios, Insumos, Midea/High Value, Conveyor General) -- WC LINEA
   1..10/PROYECTO (Familia A) y las cards de soporte (Familia B) NUNCA
   consumen esto, se quedan exactamente como estaban.

   El rango se deriva SIEMPRE del `role` real de la estacion (workstation.role,
   ver workstations.js/buildCustomRolePlan -- el string SIN sufijo numerico,
   ej. "Ayudante General Paletizador", no "Ayudante General Paletizador 3") --
   NUNCA del nombre del empleado. Esto es a proposito (peticion explicita del
   usuario: "NO usar condiciones basadas en nombres... la logica debe
   depender de los datos reales: área/puesto/rango/rol") -- si mañana Patricia
   cambia de puesto, o alguien nuevo entra a un puesto existente, el rango se
   recalcula solo, sin tocar este archivo.

   Los 3 rangos superiores (Head Chief Area/Gerente FFT/Supervisor) no tienen
   hoy ningun puesto real en las areas LINE_LIKE que los produzca (esos roles
   viven en sus propias WC de apoyo -- Familia B, sin tocar) -- se definen
   igual para que la jerarquia quede completa en la leyenda y por si algun
   dia una de estas areas SI llega a tener un puesto con ese nombre real,
   sin tener que volver a tocar este archivo. Nunca se le asigna rango a
   nadie por adivinanza: si el puesto no calza con ninguna regla conocida,
   getPersonnelRank devuelve null ("Sin información disponible", nunca se
   inventa un rango). ───────────────────────────────────────────── */

export const PERSONNEL_RANKS = {
  HEAD_CHIEF_AREA: { key: 'HEAD_CHIEF_AREA', order: 1, label: 'Head Chief Area', color: '#6D28D9' },
  GERENTE_FFT: { key: 'GERENTE_FFT', order: 2, label: 'Gerente FFT', color: '#1E3A8A' },
  SUPERVISOR: { key: 'SUPERVISOR', order: 3, label: 'Supervisor', color: '#2563EB' },
  TEAM_LEADER: { key: 'TEAM_LEADER', order: 4, label: 'Team Leader', color: '#0D9488' },
  OPERADOR_ESPECIALIZADO: { key: 'OPERADOR_ESPECIALIZADO', order: 5, label: 'Operador especializado', color: '#D97706' },
  AYUDANTE_GENERAL: { key: 'AYUDANTE_GENERAL', order: 6, label: 'Ayudante General', color: '#64748B' },
  PERSONAL_DE_APOYO: { key: 'PERSONAL_DE_APOYO', order: 7, label: 'Personal de apoyo', color: '#DB2777' },
}

/* Orden fijo para la leyenda (Nivel 1 -> Nivel 7). */
export const PERSONNEL_RANK_ORDER = Object.values(PERSONNEL_RANKS).sort((a, b) => a.order - b.order)

const EXACT_ROLE_TO_RANK = {
  'Jefe de Área': PERSONNEL_RANKS.HEAD_CHIEF_AREA,
  'Gerente FFT': PERSONNEL_RANKS.GERENTE_FFT,
  'Supervisor': PERSONNEL_RANKS.SUPERVISOR,
  'Team Leader': PERSONNEL_RANKS.TEAM_LEADER,
  // "Calidad" es el rol real (LINE_BASE_ROLES) para inspeccion/apoyo de calidad dentro de una
  // linea -- si algun dia una area LINE_LIKE llega a tener un puesto literal "Calidad" (ej.
  // alguien de Calidad reubicado ahi conserva ese rol real), se identifica como apoyo aqui, sin
  // rastrear que la persona "viene de Calidad" -- es el ROL actual el que decide, nunca el origen.
  'Calidad': PERSONNEL_RANKS.PERSONAL_DE_APOYO,
}

/* Puestos genericos sin nombre oficial todavia (ver LINE_LIKE_AREA_IDS en
   workstations.js, "Puesto (nombre oficial pendiente de definir)") -- nunca
   se les inventa un rango, quedan sin clasificar a proposito. */
const UNKNOWN_ROLE_PLACEHOLDER = 'Puesto (nombre oficial pendiente de definir)'

/**
 * Deriva el rango visual a partir del `role` REAL de la estacion (nunca del
 * nombre del empleado). Devuelve null si el puesto no tiene informacion
 * suficiente para clasificarlo (nunca se inventa un rango) -- quien consuma
 * esto debe mostrar "Sin información disponible" en ese caso.
 */
export function getPersonnelRank(role) {
  if (!role || role === UNKNOWN_ROLE_PLACEHOLDER) return null
  const trimmed = role.trim()
  if (EXACT_ROLE_TO_RANK[trimmed]) return EXACT_ROLE_TO_RANK[trimmed]
  if (/^ayudante general/i.test(trimmed)) return PERSONNEL_RANKS.AYUDANTE_GENERAL
  // Cualquier otro puesto real y especifico (Operador de X, Materialista, Surtidor de
  // Accesorios, Controles, Armar Bases, Conveyor, Tornillería, Cables, ...) es una tarea
  // tecnica/especializada nombrada -- entra en Operador especializado.
  return PERSONNEL_RANKS.OPERADOR_ESPECIALIZADO
}
