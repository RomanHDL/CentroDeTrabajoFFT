import { useEffect, useState } from 'react'
import { getActiveAreaGroup, subscribeAreaGroup } from './areaGroup'

/* Fuerza un re-render cuando cambia el grupo de area activo (FFT/Sorting), sin importar en
   que componente se origino el cambio -- mismo patron que usePersonnelVersion.js. Devuelve el
   grupo activo directo (no solo un contador), para que el caller no tenga que volver a llamar
   getActiveAreaGroup() aparte. */
export function useAreaGroup() {
  const [group, setGroup] = useState(getActiveAreaGroup)
  useEffect(() => subscribeAreaGroup(() => setGroup(getActiveAreaGroup())), [])
  return group
}
