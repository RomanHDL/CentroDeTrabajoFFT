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

// APOYO (2026-08-28, "ajustes controlados", a peticion explicita del
// usuario -- "la mayoria de puestos operativos deben utilizar Ayudante
// General... el rol/rango indica que pertenece a Ayudante General"):
// mismo enum de Prisma (WorkstationCategory.APOYO, sin cambio de schema),
// solo se renombra el LABEL visible de "Apoyo operativo" a "Ayudante
// General" -- key/color/iconKey no cambian. Antes NINGUN `role` real de
// WC LINEA mapeaba aqui (era solo leyenda), asi que renombrar el label no
// afecta a nadie mas que a Empaque (unico rol nuevo que se mapea aqui,
// ver ROLE_TO_CATEGORY_KEY.Empaque mas abajo).
export const LINE_VISUAL_TYPES = {
  LIDERAZGO: { key: 'LIDERAZGO', label: 'Team Leader', color: '#0D9488', iconKey: 'liderazgo' },
  CALIDAD: { key: 'CALIDAD', label: 'Calidad', color: '#DB2777', iconKey: 'calidad' },
  PRODUCCION: { key: 'PRODUCCION', label: 'Producción', color: '#2563EB', iconKey: 'produccion' },
  TECNICO: { key: 'TECNICO', label: 'Técnico / Especializado', color: '#F59E0B', iconKey: 'tecnico' },
  SUMINISTRO: { key: 'SUMINISTRO', label: 'Suministro', color: '#7C3AED', iconKey: 'suministro' },
  APOYO: { key: 'APOYO', label: 'Ayudante General', color: '#64748B', iconKey: 'apoyo' },
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
   las estaciones generadas por el codigo, nunca se duplica en dos lugares.

   2026-08-28 (tercera ronda, a peticion explicita del usuario -- "en las
   lineas solo hay puros ayudantes y una persona de calidad y ya"): TODOS
   los puestos operativos de WC LINEA pasan a "Ayudante General" (APOYO) --
   Montaje/Etiquetado/Limpieza de TV/Suministro de Accesorios/Prueba
   eléctrica ya NO son Producción/Técnico/Suministro. Calidad y Team Leader
   son las UNICAS excepciones (conservan su propia categoria). PRODUCCION/
   TECNICO/SUMINISTRO quedan definidas en LINE_VISUAL_TYPES por
   completitud de leyenda (mismo criterio que OPERADOR_ESPECIALIZADO en
   rankSystem.js), pero ya ningun `role` real las dispara. IMPORTANTE:
   despues de este cambio hay que re-correr `npm run seed-personnel` --
   Workstation.category ya esta explicito en la base de datos (backfill de
   una tarea anterior) y ese campo tiene PRIORIDAD sobre este mapa
   (getPersonnelVisualType), asi que sin re-sembrar seguiria mostrando la
   categoria vieja. */
export const ROLE_TO_CATEGORY_KEY = {
  'Team Leader': 'LIDERAZGO',
  'Calidad': 'CALIDAD',
  'Montaje': 'APOYO',
  'Etiquetado': 'APOYO',
  'Limpieza de TV': 'APOYO',
  'Suministro de Accesorios': 'APOYO',
  'Prueba eléctrica': 'APOYO',
  'Empaque': 'APOYO',
}

export function getPersonnelVisualType({ stationRole, actividad, category } = {}) {
  if (category && LINE_VISUAL_TYPES[category]) return LINE_VISUAL_TYPES[category]
  if (actividad === 'LIDER') return LINE_VISUAL_TYPES.LIDERAZGO
  if (stationRole && ROLE_TO_CATEGORY_KEY[stationRole]) return LINE_VISUAL_TYPES[ROLE_TO_CATEGORY_KEY[stationRole]]
  return null
}
