/* ─────────────────────────────────────────────
   Config del layout fisico del area (plano real) y de los grupos
   de color usados para distinguir tipos de area. Es solo
   configuracion/presentacion — no deriva conteos aqui (eso vive en
   personnelByArea.js para no duplicar logica entre Dashboard y
   Centro de Trabajo).

   PHYSICAL_ZONES son las zonas del plano fisico compartido por el
   Dashboard y Centro de Trabajo (mismo <WorkAreaMap>). "FFT" no es
   un area real del catalogo — es el bloque que agrupa LINEA1..10
   (10 lineas reales; NO existe "Linea 0" — lo que antes se leia
   como L0 es en realidad PROYECTO/"Linea de proyecto", un area
   independiente que se muestra en el layout, no dentro de FFT).
   Sorting se elimino del layout operativo a peticion del usuario
   (no aporta valor visual actual); no se borro ningun dato de
   catalogo/backend relacionado, solo dejo de pintarse aqui.
   PNP-POC-PEN y Box Prep tambien se retiraron del layout (a peticion
   del usuario, 2026-08-19) — no tenian ningun area del catalogo
   mapeada, eran solo placeholders "Sin datos"; no se borro ningun
   dato real, simplemente dejaron de pintarse aqui.

   Los `label` de aqui son los titulos que se ven en las cajas
   principales del layout — todos empiezan con "CT " (Centro de
   Trabajo), igual que `name` en catalog.js, para que el titulo de
   la caja y el titulo del detalle/drawer coincidan siempre.
   ───────────────────────────────────────────── */

import i18n from '../../i18n'
import { LINES_ONLY, WORK_CENTERS } from './catalog'

export const FFT_LINE_IDS = LINES_ONLY.map((w) => w.id)

/* Definiciones puras (id/areaIds, nunca cambian) -- separadas del label
   traducido para que IDS_IN_PHYSICAL_ZONES (calculo estatico de solo ids,
   abajo) no dependa de i18n. Los labels reales SIEMPRE se resuelven en
   getPhysicalZones() (funcion, nunca objeto estatico) para que nunca
   queden "congelados" en el idioma que estaba activo cuando el modulo se
   importo -- ver HARD RULE de i18n en src/i18n.js. */
const PHYSICAL_ZONE_DEFS = {
  PROYECTO: { id: 'PROYECTO', areaIds: ['PROYECTO'] },
  FFT: { id: 'FFT', areaIds: FFT_LINE_IDS },
  HIGHVALUE: { id: 'HIGHVALUE', areaIds: ['HIGH_VALUE'] },
  SELLADO: { id: 'SELLADO', areaIds: ['SELLADO'] },
  INSUMOS: { id: 'INSUMOS', areaIds: ['INSUMOS'] },
  SUMINISTRO: { id: 'SUMINISTRO', areaIds: ['SUMINISTRO_MATERIAL'] },
  PALLETIZING: { id: 'PALLETIZING', areaIds: ['PALETIZADO'] },
  ACCESSORIES: { id: 'ACCESSORIES', areaIds: ['ACCESORIOS'] },
}

export function getPhysicalZones() {
  return {
    PROYECTO: {
      ...PHYSICAL_ZONE_DEFS.PROYECTO,
      label: i18n.t('dataLayer:layoutZones.proyecto'),
    },
    FFT: { ...PHYSICAL_ZONE_DEFS.FFT, label: i18n.t('dataLayer:layoutZones.fft') },
    HIGHVALUE: {
      ...PHYSICAL_ZONE_DEFS.HIGHVALUE,
      label: i18n.t('dataLayer:layoutZones.highValue'),
    },
    SELLADO: { ...PHYSICAL_ZONE_DEFS.SELLADO, label: i18n.t('dataLayer:layoutZones.sellado') },
    INSUMOS: { ...PHYSICAL_ZONE_DEFS.INSUMOS, label: i18n.t('dataLayer:layoutZones.insumos') },
    SUMINISTRO: {
      ...PHYSICAL_ZONE_DEFS.SUMINISTRO,
      label: i18n.t('dataLayer:layoutZones.suministro'),
    },
    PALLETIZING: {
      ...PHYSICAL_ZONE_DEFS.PALLETIZING,
      label: i18n.t('dataLayer:layoutZones.palletizing'),
    },
    ACCESSORIES: {
      ...PHYSICAL_ZONE_DEFS.ACCESSORIES,
      label: i18n.t('dataLayer:layoutZones.accessories'),
    },
  }
}

const IDS_IN_PHYSICAL_ZONES = new Set(Object.values(PHYSICAL_ZONE_DEFS).flatMap((z) => z.areaIds))

/* Fase 6 (MI Stack Reference, cierre): extraida de WorkAreaMap.jsx (890
   lineas, MUI) al eliminar ese componente muerto -- ya no se renderiza en
   ningun lado desde que OperatingFloorPlan.jsx lo reemplazo, pero este
   helper puro (sin JSX/MUI) seguia en uso real por AreasLayoutView.jsx
   para el caso especial "click en FFT". Clasifica una PHYSICAL_ZONE segun
   cuantas areas reales agrupa, para decidir que tipo de panel de detalle
   mostrar (vacio/area unica/grupo de zona). */
export function describeZoneSelection(zone) {
  if (zone.areaIds.length === 0) return { type: 'empty', id: zone.id, label: zone.label }
  if (zone.areaIds.length === 1) return { type: 'area', id: zone.areaIds[0] }
  return { type: 'zoneGroup', id: zone.id, areaIds: zone.areaIds, label: zone.label }
}

/* Areas auxiliares = todo lo que existe en el catalogo real pero no
   aparece ya representado dentro del bloque fisico principal
   (lineas FFT, Paletizado, Accesorios). Se muestran organizadas
   debajo/alrededor del layout, tal como pide el Excel real. */
export function getAuxiliaryAreas() {
  return WORK_CENTERS.filter((w) => w.kind === 'area' && !IDS_IN_PHYSICAL_ZONES.has(w.id))
}

/* Grupos de color MUY suaves, solo para distinguir tipo de area —
   nunca reemplazan el texto/etiqueta. Funcion (nunca objeto estatico)
   por la misma razon que getPhysicalZones() arriba: el label debe
   resolverse fresco en cada llamada, nunca congelarse en el idioma de
   cuando se importo el modulo. */
export function getColorGroups() {
  return {
    PRODUCCION: { label: i18n.t('dataLayer:layoutZones.production'), color: '#3B82F6' },
    SOPORTE_PRODUCCION: {
      label: i18n.t('dataLayer:layoutZones.productionSupport'),
      color: '#F59E0B',
    },
    CALIDAD_VALOR: { label: i18n.t('dataLayer:layoutZones.qualityValue'), color: '#F43F5E' },
    SOPORTE: { label: i18n.t('dataLayer:layoutZones.support'), color: '#14B8A6' },
    ADMINISTRATIVO: { label: i18n.t('dataLayer:layoutZones.administrative'), color: '#A855F7' },
    LOGISTICA: { label: i18n.t('dataLayer:layoutZones.logistics'), color: '#64748B' },
  }
}

const AREA_TO_GROUP = {
  PALETIZADO: 'PRODUCCION',
  ACCESORIOS: 'PRODUCCION',
  PROYECTO: 'PRODUCCION',
  CONVEYOR_PRINCIPAL: 'PRODUCCION',
  CONVEYOR_SECUNDARIO: 'PRODUCCION',
  SELLADO: 'SOPORTE_PRODUCCION',
  INSUMOS: 'SOPORTE_PRODUCCION',
  SUMINISTRO_MATERIAL: 'SOPORTE_PRODUCCION',
  BOX_PREP: 'SOPORTE_PRODUCCION',
  CALIDAD: 'CALIDAD_VALOR',
  HIGH_VALUE: 'CALIDAD_VALOR',
  SOPORTE: 'SOPORTE',
  LIMPIEZA: 'SOPORTE',
  TEAM_LEADER: 'ADMINISTRATIVO',
  SUPERVISOR: 'ADMINISTRATIVO',
  GERENTE: 'ADMINISTRATIVO',
  CAPACITACION: 'ADMINISTRATIVO',
}

export function colorGroupForArea(areaId) {
  if (FFT_LINE_IDS.includes(areaId)) return 'PRODUCCION'
  return AREA_TO_GROUP[areaId] || 'SOPORTE'
}

export function colorForArea(areaId) {
  return getColorGroups()[colorGroupForArea(areaId)].color
}
