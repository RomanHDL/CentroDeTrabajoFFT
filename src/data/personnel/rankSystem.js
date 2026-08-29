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

// iconKey/description (2026-08-28, rediseño "tablero operativo" de areas
// LINE_LIKE, a peticion explicita del usuario): campos ADITIVOS -- ningun
// consumidor existente (LineStationCard.jsx, RankLegend.jsx) los lee, asi
// que su comportamiento no cambia. El mapeo iconKey -> icono real de
// @mui/icons-material vive en la capa de presentacion (HierarchyLegend.jsx/
// LineLikeAreaDetail.jsx), nunca aqui (este archivo se queda framework-
// agnostico, solo datos).
export const PERSONNEL_RANKS = {
  HEAD_CHIEF_AREA: {
    key: 'HEAD_CHIEF_AREA',
    order: 1,
    label: 'Head Chief Area',
    color: '#6D28D9',
    iconKey: 'headChief',
    description: 'Máxima autoridad del área',
  },
  GERENTE_FFT: {
    key: 'GERENTE_FFT',
    order: 2,
    label: 'Gerente FFT',
    color: '#1E3A8A',
    iconKey: 'gerente',
    description: 'Nivel ejecutivo',
  },
  SUPERVISOR: {
    key: 'SUPERVISOR',
    order: 3,
    label: 'Supervisor',
    color: '#2563EB',
    iconKey: 'supervisor',
    description: 'Supervisión operativa',
  },
  TEAM_LEADER: {
    key: 'TEAM_LEADER',
    order: 4,
    label: 'Team Leader',
    color: '#0D9488',
    iconKey: 'teamLeader',
    description: 'Liderazgo de equipo',
  },
  // 2026-08-28 (tercera ronda, a peticion explicita del usuario -- "operador de
  // compatibilidad es ayudante general operador de compatibilidad"): YA NO es
  // excepcion -- REEMPLAZA la decision de una ronda anterior de esta misma
  // tarea, que lo dejaba con rango propio. Se deja el rango DEFINIDO por
  // completitud de leyenda/compatibilidad hacia atras (mismo criterio que
  // OPERADOR_ESPECIALIZADO abajo), pero ya no hay ninguna entrada en
  // EXACT_ROLE_TO_RANK que lo dispare -- "Operador de Compatibilidad" cae en
  // el fallback AYUDANTE_GENERAL como cualquier otro puesto especifico: el
  // NOMBRE del puesto (función) sigue siendo "Operador de Compatibilidad",
  // solo cambia el rango mostrado.
  OPERADOR_DE_COMPATIBILIDAD: {
    key: 'OPERADOR_DE_COMPATIBILIDAD',
    order: 5,
    label: 'Operador de Compatibilidad',
    color: '#D97706',
    iconKey: 'compatibilidad',
    description: 'Compatibilidad de producto',
  },
  // OPERADOR_ESPECIALIZADO ya no tiene ningun puesto real que lo dispare (ver getPersonnelRank
  // -- el fallback ahora es AYUDANTE_GENERAL) -- se deja definido por completitud de la leyenda
  // y compatibilidad hacia atras, igual que ya se hacia con HEAD_CHIEF_AREA/GERENTE_FFT/SUPERVISOR.
  OPERADOR_ESPECIALIZADO: {
    key: 'OPERADOR_ESPECIALIZADO',
    order: 6,
    label: 'Operador especializado',
    color: '#EA580C',
    iconKey: 'operador',
    description: 'Operación técnica/especializada',
  },
  AYUDANTE_GENERAL: {
    key: 'AYUDANTE_GENERAL',
    order: 7,
    label: 'Ayudante General',
    color: '#64748B',
    iconKey: 'ayudante',
    description: 'Personal operativo general',
  },
  PERSONAL_DE_APOYO: {
    key: 'PERSONAL_DE_APOYO',
    order: 8,
    label: 'Personal de apoyo',
    color: '#DB2777',
    iconKey: 'apoyo',
    description: 'Apoyo transversal desde otra función',
  },
}

/* Orden fijo para la leyenda (Nivel 1 -> Nivel 7). */
export const PERSONNEL_RANK_ORDER = Object.values(PERSONNEL_RANKS).sort((a, b) => a.order - b.order)

const EXACT_ROLE_TO_RANK = {
  'Jefe de Área': PERSONNEL_RANKS.HEAD_CHIEF_AREA,
  'Gerente FFT': PERSONNEL_RANKS.GERENTE_FFT,
  Supervisor: PERSONNEL_RANKS.SUPERVISOR,
  'Team Leader': PERSONNEL_RANKS.TEAM_LEADER,
  // "Calidad" es el rol real (LINE_BASE_ROLES) para inspeccion/apoyo de calidad dentro de una
  // linea -- si algun dia una area LINE_LIKE llega a tener un puesto literal "Calidad" (ej.
  // alguien de Calidad reubicado ahi conserva ese rol real), se identifica como apoyo aqui, sin
  // rastrear que la persona "viene de Calidad" -- es el ROL actual el que decide, nunca el origen.
  // Calidad ya tenia su propio rango dedicado de una tarea anterior explicita, no se toca
  // sin que el usuario lo pida.
  Calidad: PERSONNEL_RANKS.PERSONAL_DE_APOYO,
  // "Operador de Compatibilidad" (2026-08-28, tercera ronda) YA NO esta aqui -- dejo de ser
  // excepcion, ver el comentario junto a PERSONNEL_RANKS.OPERADOR_DE_COMPATIBILIDAD arriba.
  // Cae en el fallback AYUDANTE_GENERAL de getPersonnelRank, como cualquier otro puesto.
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
  // 2026-08-28 ("CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a peticion explicita del
  // usuario, "quiero simplificar la clasificacion"): CUALQUIER otro puesto real y especifico
  // (Materialista, Surtidor de Accesorios, Controles, Armar Bases, Conveyor, Tornillería,
  // Cables, Dry Ice, Burbuja, Bolsas, ...) ahora es AYUDANTE_GENERAL -- el nombre exacto del
  // puesto (workstation.role) sigue disponible aparte como "función" (ver LineStationCard.jsx),
  // nunca se pierde esa informacion, solo cambia el RANGO mostrado. Antes caia en
  // OPERADOR_ESPECIALIZADO (ver arriba, rango que se deja definido mas nunca disparado).
  return PERSONNEL_RANKS.AYUDANTE_GENERAL
}
