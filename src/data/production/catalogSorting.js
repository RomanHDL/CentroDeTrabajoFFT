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

   `idealHeadcount: null` en las 6 areas simples es intencional (nunca inventar un ideal que el
   usuario no dio -- mismo criterio que INSUMOS/CALIDAD en catalog.js, "Sin plantilla
   definida"). SORT_LINEA si tiene un ideal real: 7 puestos x 2 personas c/u = 14, dado
   explicitamente por el usuario. Todas kind:'area' (nunca 'linea') a proposito -- SORT_LINEA
   es una sola linea, no una familia de 0-10 como WC LINEA, asi que no necesita el manejo
   especial de LINE_FAMILY_AREA_IDS/LINE_FAMILY_WORK_CENTERS (ese mecanismo es exclusivo de la
   familia LINEA1-10 + PROYECTO de FFT). Las estaciones reales (capacity, nombre de cada
   puesto) se configuran despues en vivo desde "Configurar puestos" (LineDetailDrawer.jsx),
   mismo mecanismo ya usado por WC LINEA -- ver scripts/seed-sorting-work-areas-2026-09-08.mjs
   para el sembrado inicial en la base de datos real. */

export const SORTING_WORK_CENTERS = [
  {
    id: 'SORT_LINEA',
    name: 'Línea de Sorting',
    kind: 'area',
    type: 'PRODUCTION_LINE',
    isProduction: true,
    dailyTarget: null,
    idealHeadcount: 14,
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
]

export const SORTING_LINE_FAMILY_AREA_IDS = new Set()
export const SORTING_LINE_FAMILY_WORK_CENTERS = []
