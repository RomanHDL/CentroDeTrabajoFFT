import { useSearchParams } from 'react-router-dom'

/* ─────────────────────────────────────────────
   Fuente unica de "que Work Center esta abierto" en /centro-trabajo --
   2026-08-27, a peticion explicita del usuario: la URL debe reflejar el
   area actual (?area=<id>) para que refresh/back-forward del navegador
   funcionen de verdad, y para unificar los DOS puntos independientes
   que antes abrian AreaDetail con su propio useState local sin
   conocerse entre si (CentroTrabajoPage.jsx/selectedLine y
   OperatingFloorPlan.jsx/assignAreaId -- un click directo en el plano
   nunca actualizaba lo que la pestaña "Lineas"/"Estaciones" creia
   abierto). Cualquier componente que llame este hook queda
   automaticamente sincronizado con los demas (useSearchParams ya
   comparte el mismo history/location de react-router-dom), sin
   prop-drilling adicional.

   setSearchParams (por defecto) hace PUSH en el history -- exactamente
   lo que se pidio: cada area visitada queda en el historial, así el
   boton "atras" del navegador regresa a la anterior. ───────────────────────────────────────────── */
const PARAM = 'area'

export function useSelectedWorkCenter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const workCenterId = searchParams.get(PARAM) || null

  function openWorkCenter(id) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id) next.set(PARAM, id)
      else next.delete(PARAM)
      return next
    })
  }

  function closeWorkCenter() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete(PARAM)
      return next
    })
  }

  return { workCenterId, openWorkCenter, closeWorkCenter }
}
