/* ─────────────────────────────────────────────
   Agregado real de Team Leaders (2026-08-28, "REDISEÑO DE 6 AREAS
   ESPECIALES", a peticion explicita del usuario). Usado UNICAMENTE por
   la vista de referencia de WC Team Leader (SpecialAreaDetail.jsx) --
   NUNCA crea, mueve ni libera nada, solo LEE fuentes que ya alimentan
   getAreaStaffing/getGroupAreaStaffing de cada area real -- por eso el
   conteo global/dashboard nunca se duplica: esas fuentes ya se contaban
   ahi, este archivo solo las junta en una lista para mostrarlas.

   El area actual de cada lider se conoce por construccion (la clave del
   bucle que lo encontro), nunca via getCurrentAssignment (ese filtra por
   fecha exacta de hoy -- mismo patron de bug ya corregido en otros
   lugares esta sesion, pero fuera de alcance tocarlo aqui; evitarlo por
   completo es mas seguro que depender de el). ───────────────────────────────────────────── */

import { CUSTOM_STATION_PLANS, LINE_FAMILY_AREA_IDS, workCenterById } from '../production/catalog'
import { getPeopleByArea } from '../production/personnelByArea'
import { getLineWorkstationsWithOccupancy } from './repository'

/* Areas reales (fuera de WC Team Leader mismo) cuya plantilla ya incluye
   un puesto literal 'Team Leader' -- derivado de CUSTOM_STATION_PLANS,
   nunca una lista de ids a mano: si mañana otra area agrega ese rol, se
   detecta sola sin tocar este archivo. Ampliado 2026-08-27 ("estaciones
   configurables por ADMINISTRADOR" + puesto Team Leader por linea) para
   tambien incluir las 11 WC LINEA (0..10, LINE_FAMILY_AREA_IDS) -- desde
   esa tarea, cualquiera de ellas puede tener un puesto 'Team Leader' real
   (sembrado vacio por defecto, ver scripts/seed-personnel.mjs, o creado
   por un ADMINISTRADOR via el drawer de configuracion de puestos). */
function areasWithTeamLeaderRole() {
  const fromCustomPlans = Object.entries(CUSTOM_STATION_PLANS)
    .filter(([, plan]) => plan.some((entry) => entry.role === 'Team Leader'))
    .map(([areaId]) => areaId)
  return [...fromCustomPlans, ...LINE_FAMILY_AREA_IDS]
}

/**
 * Todos los empleados reales cuyo rol actual es Team Leader, sin
 * importar en que area esten fisicamente asignados hoy -- nunca mueve,
 * nunca duplica, nunca inventa. Cada entrada trae `areaId`/`areaName`
 * (su ubicacion REAL actual, no WC Team Leader) para dejar claro que es
 * una vista de referencia.
 */
export function getAllRealTeamLeaders() {
  const seen = new Set()
  const result = []

  // 1) Personal asignado DIRECTAMENTE al area de soporte WC Team Leader.
  ;(getPeopleByArea().TEAM_LEADER || []).forEach((person) => {
    if (!person?.id || seen.has(person.id)) return
    seen.add(person.id)
    result.push({
      employee: person,
      employeeNumber: person.employeeNumber,
      areaId: 'TEAM_LEADER',
      areaName: workCenterById('TEAM_LEADER')?.name || 'WC Team Leader',
    })
  })

  // 2) Quien ocupe hoy un puesto real 'Team Leader' en otra area
  //    (Paletizado/Accesorios/Insumos hoy -- derivado arriba, no fijo).
  areasWithTeamLeaderRole().forEach((areaId) => {
    getLineWorkstationsWithOccupancy(areaId)
      .filter((w) => w.role === 'Team Leader')
      .forEach((w) => {
        w.occupants.forEach((o) => {
          if (!o.employee?.id || seen.has(o.employee.id)) return
          seen.add(o.employee.id)
          result.push({
            employee: o.employee,
            employeeNumber: o.employeeNumber,
            areaId,
            areaName: workCenterById(areaId)?.name || areaId,
          })
        })
      })
  })

  return result
}
