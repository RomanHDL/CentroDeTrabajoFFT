import {
  LINE_FAMILY_AREA_IDS,
  LINE_FAMILY_WORK_CENTERS,
  workCenterById,
} from '../../data/production/catalog'

/*
  Áreas principales del selector "Área / Línea" en Registrar personal (2026-09-14, a petición
  explícita del usuario, viendo el layout físico real de FFT -- las mismas 9 áreas que ya dibuja
  OperatingFloorPlan.jsx): esta lista es SOLO un filtro de interfaz para ESTE formulario --
  Calidad/Sellado/Suministro de material/Box Prep/Entrenador/Soporte/Gerente/Supervisor siguen
  existiendo tal cual en catalog.js (WORK_CENTERS), nunca se borran ni se desactivan por esto, y
  siguen disponibles como antes en cualquier otra pantalla (plano, detalle de área, etc.).

  Los 11 WC LINEA (LINEA1..10 + PROYECTO/"WC LINEA 0") se agrupan visualmente bajo un solo item
  "WC Líneas de producción (FFT)" -- id sentinel LINE_FAMILY_GROUP_ID, NUNCA un id real
  persistido -- al elegirlo se revela el subselector "Línea" (LINE_FAMILY_WORK_CENTERS,
  catalog.js, ya viene ordenado 0..10). `form.areaId` en RegisterPersonnelForm.jsx sigue siendo
  SIEMPRE un id real de WORK_CENTERS (LINEA1, PALETIZADO, etc.) -- este sentinel nunca se guarda
  ni se manda al backend, es puramente un valor de UI para saber qué tarjeta mostrar marcada.

  Solo aplica cuando el grupo de área activo es FFT (ver useAreaGroup()) -- en Sorting, o cuando
  el area ya viene fija (`fixedAreaId`), RegisterPersonnelForm.jsx sigue usando el <Select> plano
  de siempre sobre WORK_CENTERS completo, sin pasar por este archivo.
*/
export const LINE_FAMILY_GROUP_ID = '__LINE_FAMILY__'

export const DEFAULT_LINE_FAMILY_AREA_ID = 'LINEA1'

const PRIMARY_AREA_ORDER = [
  'CONVEYOR_PRINCIPAL',
  LINE_FAMILY_GROUP_ID,
  'HIGH_VALUE',
  'PALETIZADO',
  'INSUMOS',
  'ACCESORIOS',
  'CAPACITACION',
  'TEAM_LEADER',
  'LIMPIEZA',
]

export function isLineFamilyArea(areaId) {
  return LINE_FAMILY_AREA_IDS.has(areaId)
}

/* id "principal" a mostrar seleccionado en el selector de arriba: el sentinel de línea cuando
   `areaId` es cualquiera de las 11 WC LINEA, o el propio id real en cualquier otro caso. */
export function getPrimaryAreaId(areaId) {
  return isLineFamilyArea(areaId) ? LINE_FAMILY_GROUP_ID : areaId
}

export function getPrimaryAreaOptions(lineFamilyLabel) {
  return PRIMARY_AREA_ORDER.map((id) =>
    id === LINE_FAMILY_GROUP_ID
      ? { id: LINE_FAMILY_GROUP_ID, name: lineFamilyLabel }
      : { id, name: workCenterById(id)?.name || id },
  )
}

export function getLineOptions() {
  return LINE_FAMILY_WORK_CENTERS.map((w) => ({
    id: w.id,
    name: workCenterById(w.id)?.name || w.name,
  }))
}
