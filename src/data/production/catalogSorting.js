/* Catalogo del area Sorting (2026-09-08, a peticion explicita del usuario -- layout real
   dibujado a mano en un pizarron: RCY/FRM, una linea de 7 puestos dobles -- "van dos <-> asi,
   dos apuntan < y dos >", personas trabajando en pareja enfrentadas -- y por separado KITS,
   PNP, DMR/DML y DMA/DMT como 4 areas mas). Arranca vacio (SIN snapshot real de personal, a
   diferencia de FFT que partio de LAYOUT FFT.xlsx) -- el personal se va asignando desde la app
   conforme lo muevan aqui, nunca un baseline inventado.

   Mismo *shape* exacto que las entradas de WORK_CENTERS en catalog.js (ver ese archivo) para
   que TODO el codigo que ya consume WORK_CENTERS (Dashboard, Asistencia, Registro de personal,
   Centro de Trabajo) funcione igual sin cambios -- ver applyActiveAreaGroup() en catalog.js,
   que reasigna el binding vivo WORK_CENTERS a este array cuando el usuario activa Sorting.

   `idealHeadcount: null` en las areas simples (RCY/FRM/KITS/PNP/DMR-DML/DMA-DMT/Patines) es
   -- SORT_CONVEYOR SI tiene ideal real (2, mismo criterio que CONVEYOR_PRINCIPAL de FFT) --
   intencional (nunca inventar un ideal que el usuario no dio -- mismo criterio que INSUMOS/
   CALIDAD en catalog.js, "Sin plantilla definida"). SORT_LINEA si tiene un ideal real: 7 lineas
   en V, 4 personas c/u (2 en cada extremo) = 28 -- corregido 2026-09-08 tras una segunda
   aclaracion del usuario viendo el pizarron con mas detalle (antes se habia interpretado como
   parejas de 2, 14 en total; ver scripts/update-sort-linea-capacity-2026-09-08.mjs). SORT_GERENTE
   (Gerente de Sorting) es un area de apoyo, mismo criterio que GERENTE en catalog.js (FFT):
   idealHeadcount:1, isProduction:false. Todas kind:'area' (nunca 'linea') a proposito --
   SORT_LINEA es una sola linea, no una familia de 0-10 como WC LINEA, asi que no necesita el
   manejo especial de LINE_FAMILY_AREA_IDS/LINE_FAMILY_WORK_CENTERS (ese mecanismo es exclusivo
   de la familia LINEA1-10 + PROYECTO de FFT). Las estaciones reales (capacity, nombre de cada
   puesto) se configuran despues en vivo desde "Configurar puestos" (LineDetailDrawer.jsx),
   mismo mecanismo ya usado por WC LINEA -- ver scripts/seed-sorting-work-areas-2026-09-08.mjs y
   scripts/seed-sorting-patines-gerente-2026-09-08.mjs para el sembrado real en la BD.
   SORT_SUPERVISOR (2026-09-08, sexta ronda) reemplaza el marcador decorativo "Entrada" -- ahi
   es donde el supervisor tiene su computadora, mismo criterio que SUPERVISOR en catalog.js
   (FFT). SORT_PATINES (`equipment: true` en SortingFloorPlan.jsx) nunca tiene personal
   asignado -- son los patines/carritos fisicos del area, no un puesto de trabajo. */

export const SORTING_WORK_CENTERS = [
  {
    id: 'SORT_CONVEYOR',
    name: 'Conveyor de Sorting',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    // 2026-09-08 (quinta ronda, a peticion explicita del usuario -- "no veo el conveyor aqui...
    // debe ser el conveyor del mismo grosor que el de FFT"): area real independiente, 2
    // posiciones reales -- mismo criterio que CONVEYOR_PRINCIPAL/"WC Conveyor General" en
    // catalog.js (FFT), confirmado explicitamente por el usuario via pregunta directa: debe ser
    // un area real con su propia gente, no solo decorativo. A diferencia de CONVEYOR_PRINCIPAL
    // (cuyos 2 puestos reales viven prestados dentro de Paletizado por historia acumulada, ver
    // AREA_STATION_SOURCE_OVERRIDE en catalog.js), SORT_CONVEYOR es independiente desde el
    // principio -- sin ese enredo historico que replicar. Ver scripts/seed-sorting-conveyor-
    // 2026-09-08.mjs para las 2 Workstation reales (capacity 1 c/u).
    idealHeadcount: 2,
  },
  {
    id: 'SORT_LINEA',
    name: 'Línea de Sorting',
    kind: 'area',
    type: 'PRODUCTION_LINE',
    isProduction: true,
    dailyTarget: null,
    // 2026-09-08 (correccion, a peticion explicita del usuario tras ver el pizarron con mas
    // detalle): cada una de las 7 lineas es una V con 2 personas en un extremo y otras 2 en el
    // otro -- 4 por linea, no 2 (7 x 4 = 28, antes 14). Capacidad real de las 7 Workstation ya
    // actualizada en la BD (ver scripts/update-sort-linea-capacity-2026-09-08.mjs).
    idealHeadcount: 28,
  },
  {
    id: 'SORT_RCY',
    name: 'RCY',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_FRM',
    name: 'FRM',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_KITS',
    name: 'KITS',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_PNP',
    name: 'PNP',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_DMR_DML',
    name: 'DMR / DML',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_DMA_DMT',
    name: 'DMA / DMT',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_PATINES',
    name: 'Patines',
    kind: 'area',
    type: 'WORK_AREA',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: null,
  },
  {
    id: 'SORT_GERENTE',
    name: 'Gerente de Sorting',
    kind: 'area',
    type: 'SUPPORT_AREA',
    isProduction: false,
    dailyTarget: null,
    idealHeadcount: 1,
  },
  {
    id: 'SORT_SUPERVISOR',
    name: 'Supervisor',
    kind: 'area',
    type: 'SUPPORT_AREA',
    isProduction: false,
    dailyTarget: null,
    // 2026-09-08 (sexta ronda, a peticion explicita del usuario -- "donde dice entrada es un
    // lugar donde va el supervisor y tiene ahi una compu"): reemplaza el marcador decorativo
    // "Entrada" -- area real de apoyo, mismo criterio que SUPERVISOR en catalog.js (FFT).
    idealHeadcount: 1,
  },
]

export const SORTING_LINE_FAMILY_AREA_IDS = new Set()
export const SORTING_LINE_FAMILY_WORK_CENTERS = []
