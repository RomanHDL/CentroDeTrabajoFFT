/* ─────────────────────────────────────────────
   Tipo de personal visual, exclusivo de WC LINEA 0-10 (2026-08-28,
   "REDISEÑO DE WC LINEA 0 A WC LINEA 10", a peticion explicita del
   usuario: "identidad visual propia, NO copiar el diseño de Paletizado").
   Sistema DELIBERADAMENTE separado de rankSystem.js (ese es el de
   Paletizado/Accesorios/Insumos/Midea/Conveyor, LineLikeAreaDetail.jsx) --
   nunca comparten colores/iconos/logica entre si, para que un cambio en
   uno nunca arrastre al otro.

   AMPLIADO 2026-08-27 ("estaciones configurables por ADMINISTRADOR" + puesto
   Team Leader por linea): de 5 a 6 categorias, con las etiquetas/iconos que
   pidio el usuario (Liderazgo/Calidad/Produccion/Tecnico/Suministro/Apoyo).
   Los 6 keys son EXACTAMENTE los valores del enum Prisma WorkstationCategory
   (schema.prisma) -- una estacion admin-configurada trae su `category` ya
   explicita desde la base de datos, sin adivinar nada por nombre de rol.

   Prioridad de clasificacion (nunca por nombre de persona):
   1. `category` EXPLICITA de la estacion (dato real, ver Workstation.category
      / server-lib/workstationConfig.js) -- fuente principal.
   2. Empleado con actividad real "LIDER" (BASE, getActividadForEmployee en
      personnelByArea.js) -- regla ya existente antes de esta ampliacion, se
      conserva como respaldo para no perder clasificacion en datos vistos
      antes de que las estaciones tuvieran `category` propia.
   3. Mapa de respaldo por `stationRole` conocido (ROLE_TO_CATEGORY_KEY,
      exportado y REUSADO tal cual por scripts/seed-personnel.mjs para
      backfillear `category` -- una sola fuente de verdad, nunca duplicada).
   4. Sin ocupante, o rol/categoria que no calza con nada conocido -> null
      (nunca se inventa una categoria). ───────────────────────────────────────────── */

export const LINE_VISUAL_TYPES = {
  LIDERAZGO: { key: 'LIDERAZGO', label: 'Team Leader', color: '#0D9488', iconKey: 'liderazgo' },
  CALIDAD: { key: 'CALIDAD', label: 'Calidad', color: '#DB2777', iconKey: 'calidad' },
  PRODUCCION: { key: 'PRODUCCION', label: 'Producción', color: '#2563EB', iconKey: 'produccion' },
  TECNICO: { key: 'TECNICO', label: 'Técnico / Especializado', color: '#F59E0B', iconKey: 'tecnico' },
  SUMINISTRO: { key: 'SUMINISTRO', label: 'Suministro', color: '#7C3AED', iconKey: 'suministro' },
  APOYO: { key: 'APOYO', label: 'Apoyo operativo', color: '#64748B', iconKey: 'apoyo' },
}

/* Orden fijo para la leyenda (seccion 13 del pedido). */
export const LINE_VISUAL_TYPE_ORDER = [
  LINE_VISUAL_TYPES.LIDERAZGO,
  LINE_VISUAL_TYPES.CALIDAD,
  LINE_VISUAL_TYPES.PRODUCCION,
  LINE_VISUAL_TYPES.TECNICO,
  LINE_VISUAL_TYPES.SUMINISTRO,
  LINE_VISUAL_TYPES.APOYO,
]

/* Rol base (sin sufijo numerico) -> categoria, para los puestos YA conocidos
   hoy (incluye "Team Leader", nuevo). Unica fuente de este mapeo -- tambien
   la usa scripts/seed-personnel.mjs para backfillear Workstation.category de
   las estaciones generadas por el codigo, nunca se duplica en dos lugares. */
export const ROLE_TO_CATEGORY_KEY = {
  'Team Leader': 'LIDERAZGO',
  'Calidad': 'CALIDAD',
  'Montaje': 'PRODUCCION',
  'Etiquetado': 'PRODUCCION',
  'Limpieza': 'PRODUCCION',
  'Suministro de Accesorios': 'SUMINISTRO',
  'Prueba eléctrica': 'TECNICO',
}

export function getPersonnelVisualType({ stationRole, actividad, category } = {}) {
  if (category && LINE_VISUAL_TYPES[category]) return LINE_VISUAL_TYPES[category]
  if (actividad === 'LIDER') return LINE_VISUAL_TYPES.LIDERAZGO
  if (stationRole && ROLE_TO_CATEGORY_KEY[stationRole]) return LINE_VISUAL_TYPES[ROLE_TO_CATEGORY_KEY[stationRole]]
  return null
}
