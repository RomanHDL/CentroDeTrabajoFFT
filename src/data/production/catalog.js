/* ─────────────────────────────────────────────
   Catalogo central de Areas de Trabajo para el modulo
   Control de Produccion.

   La mayoria de estas areas vienen directamente de la hoja LAYOUT del
   archivo real LAYOUT FFT.xlsx (tabla resumen AREA/IDEAL/REAL,
   columnas AV:AY) — no son inventadas. BOX_PREP (ver nota mas abajo) viene
   de otra fuente real distinta: el campo `areaZona` a nivel empleado en
   realPersonnelSnapshot.js. `isProduction` distingue las lineas/areas que
   producen piezas de las areas de soporte, liderazgo y capacitacion que
   tambien aparecen ahi (el Excel mezcla ambos tipos en la misma tabla, sin
   marcarlos, asi que la clasificacion aqui es nuestra lectura de esa tabla).

   `dailyTarget` se deja en null a proposito: este Excel es de
   PERSONAL, no trae metas de produccion reales, y no vamos a
   inventar una meta. El dia que exista una fuente real de
   produccion, se llena desde ahi.

   CAJAS se quito de aqui el 2026-08-21 y quedo asi hasta el 2026-08-25,
   cuando el usuario aclaro que esa zona es realmente "Box Prep" -- ver
   WORK_CENTER 'BOX_PREP' mas abajo y mapAreaZonaToId (personnelByArea.js)
   para el mapeo real (y que "Box Prep" es la MISMA caja que ya existia
   junto a "PNP/POC/PEN" en el plano 2D -- no una segunda). INGENIERIA se
   cuenta como SUPERVISOR (sin WORK_CENTER propio). CHOFER/PRODUCCION
   (2026-08-25, correccion explicita del usuario: NO merecen su propia area
   -- son gente real de linea sin linea especifica conocida) NO tienen
   WORK_CENTER propio; se muestran en "Personal sin area asignada"
   (getPeopleWithoutArea, personnelByArea.js) con su zona cruda como
   etiqueta para poder identificarlos, en vez de un bloque nuevo. Ninguna de
   estas migraciones borro a nadie del snapshot real, solo cambio si
   aparecen agrupados en un bloque visual.
   ───────────────────────────────────────────── */

export const SHIFT_OPTIONS = ['Matutino', 'Vespertino', 'Nocturno']

export const CURRENT_SHIFT = 'Matutino'

/* Ventana horaria del turno Matutino, usada para la
   grafica de produccion por hora (cuando exista fuente real). */
export const SHIFT_HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']

/* Los 3 turnos oficiales reales del sistema (2026-08-26, a peticion
   explicita del usuario), con su ventana horaria real -- DISTINTO de
   SHIFT_HOURS de arriba (esa es solo el eje de una grafica, nunca
   represento el horario real de un turno). Se usa hoy para mostrar
   "Turno actual" con su horario real en CT LINEA; no reemplaza
   SHIFT_OPTIONS (los 3 nombres que ya usan los selects de
   Registrar/Autoasignar/Mover -- Matutino/Vespertino/Nocturno,
   fuera de alcance de este cambio, no se tocan para no invalidar
   turnos ya guardados). */
export const OFFICIAL_SHIFTS = [
  { id: 'MATUTINO', label: 'Matutino', start: '07:00', end: '17:10' },
  { id: 'TIEMPO_EXTRA', label: 'Tiempo extra', start: '17:11', end: '22:00' },
  { id: 'NOCHE', label: 'Noche', start: '22:01', end: '07:00' },
]

/* Entrada por defecto cuando se coloca automaticamente en una
   estacion a alguien que ya esta en una CT LINEA por snapshot/estado
   actual pero sin hora real de entrada (ver repository.js/
   autoFillLineStations) -- nunca una hora inventada distinta. */
export const DEFAULT_LINE_ENTRY_TIME = '07:00'

/* AREA_TYPES — distincion conceptual explicita, para que la UI
   nunca vuelva a asumir "si es un area, entonces tiene estaciones
   de linea":

   PRODUCTION_LINE  -> Linea 1..10. Unicas que usan el template de
                       estaciones/puestos (Montaje, Prueba electrica,
                       Etiquetado, etc. — data/personnel/workstations.js).
   WORK_AREA        -> areas productivas/operativas con su propia
                       forma de trabajar (Paletizado, Accesorios,
                       Cajas, Midea/High Value, Conveyor, Sellado,
                       Insumos, Suministro de material, Linea de
                       proyecto, Calidad). NUNCA reciben el template
                       de estaciones de linea.
   SUPPORT_AREA     -> grupos/funciones de personal, no producen en
                       estaciones (Capacitacion, Team Leader,
                       Soporte, Limpieza, Gerente, Supervisor).

   `idealHeadcount` = plantilla oficial (tabla IDEAL/REAL/DIFERENCIA
   proporcionada). null cuando el area no tiene plantilla oficial
   definida todavia (p. ej. CALIDAD no aparece en esa tabla) — NUNCA
   se inventa un ideal. El "REAL" NUNCA se guarda aqui: siempre se
   calcula desde el personal real (personnelByArea.getAreaHeadcount),
   para no duplicar una fuente de verdad. */
export const AREA_TYPES = {
  PRODUCTION_LINE: 'PRODUCTION_LINE',
  WORK_AREA: 'WORK_AREA',
  SUPPORT_AREA: 'SUPPORT_AREA',
}

/* Todos los nombres empiezan con "CT " (Centro de Trabajo), tal como
   en el plano fisico real del piso (pizarron, confirmado por el
   usuario 2026-08-19). Actualizacion 2026-08-24 (a peticion explicita
   del usuario): las lineas de produccion (y el CT 0/Proyecto, que se
   dibuja igual que una linea mas) ahora llevan la palabra "LINEA" —
   "CT LINEA 5", ya no "CT 5" — para distinguirlas del resto de areas
   (Calidad, Accesorios, Paletizado, etc.) que conservan su nombre tal
   cual. El `id` interno NO cambia (LINEA1, PROYECTO, etc.): eso
   evitaria tocar mapAreaZonaToId, hasLineStations, workstations.js y
   el snapshot de BASE sin necesidad — solo cambia el texto que se
   muestra. */
export const WORK_CENTERS = [
  { id: 'LINEA1', name: 'WC LINEA 1', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA2', name: 'WC LINEA 2', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA3', name: 'WC LINEA 3', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA4', name: 'WC LINEA 4', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA5', name: 'WC LINEA 5', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA6', name: 'WC LINEA 6', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA7', name: 'WC LINEA 7', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA8', name: 'WC LINEA 8', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA9', name: 'WC LINEA 9', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA10', name: 'WC LINEA 10', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'PROYECTO', name: 'WC LINEA 0', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 10 },
  { id: 'PALETIZADO', name: 'WC Paletizado', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 13 },
  { id: 'ACCESORIOS', name: 'WC Accesorios', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 20 },
  /* CONVEYOR se dividio en dos areas reales independientes (2026-08-25,
     a peticion explicita del usuario): el plano fisico (OperatingFloorPlan.jsx)
     dibuja "CONVEYOR PRINCIPAL"/"CONVEYOR SECUNDARIO" como dos barras
     separadas desde antes, pero solo existia UN area real 'CONVEYOR'
     en el catalogo -- no se podia asignar personal a cada una por
     separado. Ahora cada una es su propio WORK_CENTER (idealHeadcount
     1 cada una, igual que el 'CONVEYOR' original combinado en 1, pero
     ahora reflejando que son dos bandas fisicas reales). El id viejo
     'CONVEYOR' se quito del catalogo -- nadie tenia personal real ahi
     al momento del cambio (real=0), asi que no hubo que migrar ninguna
     asignacion existente. La zona fantasma "CT Conveyor" (singular) que
     seguia viviendo en layoutZones.js/WorkAreaMap.jsx apuntando al id viejo
     'CONVEYOR' se eliminó el 2026-08-25 (bug real reportado por el usuario:
     esa caja nunca podia recibir personal porque el area ya no existia) --
     ver layoutZones.js, PHYSICAL_ZONES ya no la incluye. */
  { id: 'CONVEYOR_PRINCIPAL', name: 'WC Conveyor Principal', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 1 },
  { id: 'CONVEYOR_SECUNDARIO', name: 'WC Conveyor Secundario', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 1 },
  /* Midea/HV: en el plano fisico real (pizarron del piso, confirmado
     por el usuario 2026-08-19) son UN solo bloque "CT MIDEA/HV", no
     dos areas separadas. Se fusiona DMT dentro de HIGH_VALUE (ideal
     14+2=16, el total general de plantilla no cambia). Quien tenga
     zona "DMT" en el snapshot de BASE se sigue contando aqui (ver
     personnelByArea.mapAreaZonaToId). */
  { id: 'HIGH_VALUE', name: 'WC Midea / High Value', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 16 },
  { id: 'CALIDAD', name: 'WC Calidad', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  /* Sellado / Insumos / Suministro de material: areas nuevas del
     plano fisico real (pizarron del piso, 2026-08-19), confirmadas
     por el usuario como areas nuevas de verdad — todavia SIN
     plantilla oficial ni personal identificado, por eso
     idealHeadcount queda null (nunca se inventa) hasta que se
     confirme la tabla IDEAL/REAL correspondiente. */
  { id: 'SELLADO', name: 'WC Sellado', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  { id: 'INSUMOS', name: 'WC Insumos', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  { id: 'SUMINISTRO_MATERIAL', name: 'WC Suministro de material', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  /* BOX_PREP (2026-08-25, a peticion explicita del usuario): antes CAJAS no
     tenia WORK_CENTER (mismo patron documentado arriba) y esas 4 personas
     reales del snapshot nunca aparecian en ningun bloque visual. El usuario
     aclaro que CAJAS es en realidad "Box Prep" -- pero es la MISMA caja
     "BOX PREP" que ya existia como decoracion junto a "PNP/POC/PEN" en el
     plano 2D (OperatingFloorPlan.jsx), no una segunda: esa caja se volvio
     real (cuenta/personas) en vez de agregarse una nueva en otro lugar.
     idealHeadcount null: no hay plantilla oficial (mismo criterio que
     CALIDAD/SELLADO/INSUMOS). CHOFER/PRODUCCION NO tienen WORK_CENTER --
     correccion explicita del usuario 2026-08-25: esa gente es real de linea
     pero no se sabe cual linea especifica, asi que NO se les inventa una
     area propia; aparecen en "Personal sin area asignada" (getPeopleWithoutArea,
     personnelByArea.js) con su zona cruda como etiqueta identificadora. */
  { id: 'BOX_PREP', name: 'WC Box Prep', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: null },
  { id: 'CAPACITACION', name: 'WC Capacitación', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'TEAM_LEADER', name: 'WC Team Leader', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'SOPORTE', name: 'WC Soporte', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 3 },
  { id: 'LIMPIEZA', name: 'WC Limpieza', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'GERENTE', name: 'WC Gerente', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 1 },
  { id: 'SUPERVISOR', name: 'WC Supervisor', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 1 },
]

export const LINES_ONLY = WORK_CENTERS.filter(w => w.kind === 'linea')
export const PRODUCTION_CENTERS = WORK_CENTERS.filter(w => w.isProduction)
export const SUPPORT_CENTERS = WORK_CENTERS.filter(w => !w.isProduction)

/* Unica fuente de verdad de "esta area usa el template de
   estaciones de linea" — antes esto se asumia implicitamente para
   TODO WORK_CENTER (el bug conceptual reportado). */
export function hasLineStations(workCenterId) {
  return workCenterById(workCenterId)?.type === AREA_TYPES.PRODUCTION_LINE
}

/* Allowlist central de areas que usan el detalle operativo nuevo
   (OperationalAreaDetail.jsx, 2026-08-25, a peticion explicita del
   usuario) -- NUNCA se decide por nombre (`if (name === 'CT Accesorios')`),
   siempre por esta lista, calculada a partir de la clasificacion REAL
   que ya existe en WORK_CENTERS (type/kind), con dos excepciones
   explicitas documentadas por el propio usuario en este mismo pedido:

   - Se EXCLUYE 'PROYECTO' (CT LINEA 0) aunque su type sea WORK_AREA:
     el usuario listo explicitamente "CT LINEA 0" junto con LINEA1..10
     como fuera de alcance ("ya tienen un diseño especial diferente").
   - Se INCLUYE 'BOX_PREP' aunque su type sea SUPPORT_AREA: el usuario
     lo pidio explicitamente por nombre en su lista de areas operativas
     ("Box Prep"), aunque el catalogo lo clasifica como apoyo
     (isProduction:false) por no tener plantilla oficial.

   El resto de type===WORK_AREA (Paletizado, Accesorios, Conveyor
   Principal/Secundario, Midea/High Value, Calidad, Sellado, Insumos,
   Suministro de material) coincide 1:1 con la lista que el usuario dio
   por nombre -- confirmado area por area, no asumido. CT Calidad
   califica porque su clasificacion real YA es WORK_AREA/isProduction:true
   (verificado antes de incluirla, tal como pidio el usuario explicitamente
   "revisar clasificacion real, no asumir"). Las SUPPORT_AREA restantes
   (Capacitacion, Team Leader, Soporte, Limpieza, Gerente, Supervisor) y
   todas las PRODUCTION_LINE quedan fuera, sin excepcion.

   CT SELLADO (2026-08-25, correccion explicita del usuario): no tiene
   entrada propia -- "va en Conveyor Principal, ponlos ahi juntos". No
   aparece en ningun lado del plano/mapa (floorPlanZones.js/
   OperatingFloorPlan.jsx la excluyen explicitamente desde antes, a
   peticion tambien explicita del usuario), asi que su unica forma de
   detalle es fusionada dentro del detalle de CONVEYOR_PRINCIPAL -- ver
   AREA_DETAIL_GROUPS/canonicalOperationalAreaId mas abajo, mismo patron
   ya usado para "CT Insumos y Suministro de material" en el plano 2D
   (dos WORK_CENTER reales, una sola representacion visual). */
export const OPERATIONAL_DETAIL_AREA_IDS = new Set([
  ...WORK_CENTERS.filter((w) => w.type === AREA_TYPES.WORK_AREA && w.id !== 'PROYECTO').map((w) => w.id),
  'BOX_PREP',
])

/* Grupos de detalle fusionado: la clave es el id "canonico" (el que se
   muestra/al que se asignan movimientos nuevos), el arreglo son TODOS
   los WORK_CENTER reales cuyo personal/plantilla se suma en ese mismo
   detalle. Hoy solo existe un grupo (Sellado dentro de Conveyor
   Principal); si el usuario pide fusionar otro par en el futuro, se
   agrega aqui, sin tocar OperationalAreaDetail.jsx. */
export const AREA_DETAIL_GROUPS = {
  CONVEYOR_PRINCIPAL: ['CONVEYOR_PRINCIPAL', 'SELLADO'],
}

/* Id canonico de detalle para cualquier miembro de un grupo -- SELLADO
   siempre resuelve a CONVEYOR_PRINCIPAL, cualquier otro id se devuelve
   tal cual (no pertenece a ningun grupo). */
export function canonicalOperationalAreaId(workCenterId) {
  const entry = Object.entries(AREA_DETAIL_GROUPS).find(([, members]) => members.includes(workCenterId))
  return entry ? entry[0] : workCenterId
}

/* Todos los ids reales cuyo personal/plantilla debe sumarse para el
   detalle de `workCenterId` -- [workCenterId] solo si no pertenece a
   ningun grupo. */
export function operationalGroupMembers(workCenterId) {
  const canonical = canonicalOperationalAreaId(workCenterId)
  return AREA_DETAIL_GROUPS[canonical] || [canonical]
}

export function usesOperationalDetail(workCenterId) {
  return OPERATIONAL_DETAIL_AREA_IDS.has(canonicalOperationalAreaId(workCenterId))
}

/* Orden central de navegacion Anterior/Siguiente entre TODOS los Work
   Centers reales -- 2026-08-27, a peticion explicita del usuario. Unica
   fuente de verdad: las 3 familias de detalle (LineDetailDrawer/
   OperationalAreaDetail/SupportAreaDetail) consumen exclusivamente
   getWorkCenterNavContext() de abajo, nunca un if/else por componente.

   NO reordena WORK_CENTERS (ese array lo consumen otras vistas -- ej.
   "Resumen por area", EstacionesTab.jsx -- que dependen de su orden
   incidental actual; reordenarlo habria reorganizado esas vistas sin
   que el usuario lo pidiera, ver "NO reorganizar el mapa/layout
   general" en el pedido). Este es un array SEPARADO, de solo ids
   reales, exclusivo para navegacion -- una sola fuente de verdad para
   ESTE proposito, sin desincronizarse porque nunca se copian nombres/
   ids a mano en otro lado, solo se referencia WORK_CENTERS.

   SELLADO se excluye a proposito: no tiene detalle propio, cualquier
   click sobre ella resuelve a CONVEYOR_PRINCIPAL (AREA_DETAIL_GROUPS
   arriba) -- incluirla aqui crearia una parada duplicada/inalcanzable.
   "PNP / POC / PEN" tampoco tiene WORK_CENTER real (decoracion en
   floorPlanZones.js/REFERENCE_ONLY_ZONES) -- nunca se inventa un id
   para poder navegar a algo que no existe. "WC LINEA 11" no existe hoy
   en WORK_CENTERS (confirmado) -- si se agrega en el futuro con
   kind:'linea', LINES_ONLY la recoge sola (mismo patron que las demas
   lineas) y aparece aqui automaticamente, sin volver a tocar este
   archivo. El .filter final es una red de seguridad defensiva (nunca
   debería quitar nada hoy) por si algun id de esta lista dejara de
   existir en WORK_CENTERS. */
export const WORK_CENTER_NAVIGATION_ORDER = [
  'PROYECTO',
  ...LINES_ONLY.map((w) => w.id),
  'CONVEYOR_PRINCIPAL', 'CONVEYOR_SECUNDARIO',
  'HIGH_VALUE', 'PALETIZADO', 'BOX_PREP', 'INSUMOS', 'SUMINISTRO_MATERIAL', 'ACCESORIOS', 'CALIDAD',
  'CAPACITACION', 'TEAM_LEADER', 'SOPORTE', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR',
].filter((id) => WORK_CENTERS.some((w) => w.id === id))

/* previous/current/next dentro de WORK_CENTER_NAVIGATION_ORDER --
   navegacion LINEAL (nunca circular): en el primer elemento `previous`
   es null, en el ultimo `next` es null. `currentAreaId` se resuelve a
   su id canonico primero (ej. SELLADO -> CONVEYOR_PRINCIPAL) para que
   anterior/siguiente funcionen igual sin importar por cual id grupal
   se haya abierto el detalle. */
export function getWorkCenterNavContext(currentAreaId) {
  const canonicalId = currentAreaId ? canonicalOperationalAreaId(currentAreaId) : null
  const idx = canonicalId ? WORK_CENTER_NAVIGATION_ORDER.indexOf(canonicalId) : -1
  if (idx === -1) return { previous: null, current: null, next: null }
  return {
    previous: idx > 0 ? workCenterById(WORK_CENTER_NAVIGATION_ORDER[idx - 1]) : null,
    current: workCenterById(WORK_CENTER_NAVIGATION_ORDER[idx]),
    next: idx < WORK_CENTER_NAVIGATION_ORDER.length - 1 ? workCenterById(WORK_CENTER_NAVIGATION_ORDER[idx + 1]) : null,
  }
}

export function getPreviousWorkCenter(currentAreaId) {
  return getWorkCenterNavContext(currentAreaId).previous
}

export function getNextWorkCenter(currentAreaId) {
  return getWorkCenterNavContext(currentAreaId).next
}

/* ─────────────────────────────────────────────
   Tres familias de detalle de area (2026-08-26, a peticion explicita del
   usuario) -- configuracion CENTRAL unica, para que ningun componente
   tenga que decidir "if (name === 'CT Capacitación')" por su cuenta:

   LINE         -> LINEA1..10 + PROYECTO (CT LINEA 0, mismo criterio ya
                   usado para excluirla de OPERATIONAL_DETAIL_AREA_IDS) ->
                   LineDetailDrawer.jsx, SIN CAMBIOS.
   OPERATIONAL  -> OPERATIONAL_DETAIL_AREA_IDS (Accesorios, Paletizado,
                   Midea/High Value, Box Prep, Insumos, Suministro,
                   Conveyor Principal/Secundario -- incluye Sellado
                   fusionada -- Calidad) -> OperationalAreaDetail.jsx.
   SUPPORT      -> el resto: Capacitacion, Team Leader, Soporte, Limpieza,
                   Gerente, Supervisor (type===SUPPORT_AREA, MENOS
                   BOX_PREP que ya tiene su excepcion explicita hacia
                   OPERATIONAL) -> SupportAreaDetail.jsx (nuevo).

   Las tres listas se derivan de WORK_CENTERS sin overlap: cada
   WORK_CENTER real cae en exactamente una. NO se decide por nombre en
   ningun momento -- ver getAreaDetailVariant, unico punto de resolucion
   (AreaDetail.jsx lo consume, no reimplementa la logica). */
export const AREA_DETAIL_VARIANTS = { LINE: 'LINE', OPERATIONAL: 'OPERATIONAL', SUPPORT: 'SUPPORT' }

export const LINE_FAMILY_AREA_IDS = new Set([...LINES_ONLY.map((w) => w.id), 'PROYECTO'])

export const SUPPORT_DETAIL_AREA_IDS = new Set(
  WORK_CENTERS.filter((w) => w.type === AREA_TYPES.SUPPORT_AREA && w.id !== 'BOX_PREP').map((w) => w.id),
)

export function getAreaDetailVariant(workCenterId) {
  if (LINE_FAMILY_AREA_IDS.has(workCenterId)) return AREA_DETAIL_VARIANTS.LINE
  if (usesOperationalDetail(workCenterId)) return AREA_DETAIL_VARIANTS.OPERATIONAL
  if (SUPPORT_DETAIL_AREA_IDS.has(canonicalOperationalAreaId(workCenterId))) return AREA_DETAIL_VARIANTS.SUPPORT
  // Defensivo: cualquier id futuro que no encaje en ninguna lista (no
  // deberia pasar hoy, las tres cubren el 100% de WORK_CENTERS) cae en
  // LINE -- LineDetailDrawer.jsx ya maneja correctamente cualquier area
  // sin estaciones de linea con su propia rama "vista simple", el mismo
  // comportamiento que existia antes de esta clasificacion.
  return AREA_DETAIL_VARIANTS.LINE
}

/* Descripcion editorial corta por area de apoyo (Parte 5 del pedido:
   revisado primero -- NO existe ningun campo de descripcion/categoria
   real en WorkArea/Employee/User, ver prisma/schema.prisma -- por eso
   esta configuracion central nueva, en un solo lugar, fácil de editar).
   Contenido tal como lo especifico el usuario, no inventado por Claude. */
export const SUPPORT_AREA_DESCRIPTIONS = {
  CAPACITACION: 'Área de capacitación y desarrollo',
  TEAM_LEADER: 'Liderazgo y coordinación operativa',
  SOPORTE: 'Soporte operativo / ingeniería',
  LIMPIEZA: 'Soporte de limpieza del área',
  GERENTE: 'Gestión y dirección del área',
  SUPERVISOR: 'Supervisión y coordinación',
}

export const STATIONS = [
  'Montaje',
  'Prueba eléctrica',
  'Limpieza',
  'Etiquetado',
  'Suministro de Accesorios',
  'Empaque',
  'Calidad',
  'Supervisión',
  'Capacitación',
]

/* Estado operativo de un centro de trabajo — independiente
   del % de avance de produccion. SIN_DATOS es el estado por
   defecto mientras no exista una fuente real de produccion;
   nunca se asume "Operando" sin evidencia. */
export const OPERATIONAL_STATUS = {
  OPERANDO: { label: 'Operando', dot: '#10B981', tone: 'ok' },
  ATENCION: { label: 'En atención', dot: '#F59E0B', tone: 'warn' },
  MANTENIMIENTO: { label: 'Mantenimiento', dot: '#3B82F6', tone: 'info' },
  DETENIDO: { label: 'Detenido', dot: '#EF4444', tone: 'bad' },
  SIN_DATOS: { label: 'Sin datos', dot: '#94A3B8', tone: 'default' },
}

export function workCenterById(id) {
  return WORK_CENTERS.find(w => w.id === id)
}
