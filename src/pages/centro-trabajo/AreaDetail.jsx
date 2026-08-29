import {
  getAreaDetailVariant,
  AREA_DETAIL_VARIANTS,
  getWorkCenterNavContext,
  canonicalOperationalAreaId,
  SPECIAL_AREA_IDS,
} from '../../data/production/catalog'
import LineDetailDrawer from './LineDetailDrawer'
import LineLikeAreaDetail from './LineLikeAreaDetail'
import OperationalAreaDetail from './OperationalAreaDetail'
import SupportAreaDetail from './SupportAreaDetail'
import SpecialAreaDetail from './SpecialAreaDetail'

/* ─────────────────────────────────────────────
   Punto UNICO de decision (2026-08-25/26, a peticion explicita del
   usuario: "NO uses cientos de if (name === ...) por toda la
   aplicacion") entre las CINCO familias de detalle de area:

   - LineDetailDrawer (SIN CAMBIOS, ni antes ni en el rediseño
     2026-08-28): CT LINEA 1..10 + CT LINEA 0/Proyecto. Ya nadie le pasa
     lineLike=true -- desde ese cambio ese prop siempre es false aqui.
   - LineLikeAreaDetail (2026-08-28, "rediseño tablero operativo"):
     Paletizado/Accesorios/Insumos/Midea/Conveyor General
     (catalog.js/LINE_LIKE_AREA_IDS).
   - OperationalAreaDetail (mockup "CT Accesorios"): areas productivas
     reales (catalog.js/OPERATIONAL_DETAIL_AREA_IDS) -- hoy vacio en la
     practica, se deja tal cual.
   - SpecialAreaDetail (NUEVO, 2026-08-28, "REDISEÑO DE 6 AREAS
     ESPECIALES", a peticion explicita del usuario): Capacitacion, Team
     Leader, Entrenador, Limpieza, Gerente FFT, Supervisor
     (catalog.js/SPECIAL_AREA_IDS, subconjunto explicito de
     SUPPORT_DETAIL_AREA_IDS) -- vista compacta sin secciones pensadas
     para produccion (Disponibles/Actividad reciente/dona), WC Team
     Leader ademas agrega una vista de referencia de todos los Team
     Leader reales (ver SpecialAreaDetail.jsx/teamLeaderRegistry.js).
   - SupportAreaDetail (mockup "CT Capacitación"): el RESTO de
     SUPPORT_DETAIL_AREA_IDS -- hoy solo Calidad y Soporte (archivada) --
     SIN CAMBIOS, el usuario no las incluyo en el pedido de rediseño.

   getAreaDetailVariant(workCenterId) (catalog.js) sigue siendo la UNICA
   fuente de la clasificacion en 4 variantes (LINE/LINE_LIKE/OPERATIONAL/
   SUPPORT); SPECIAL_AREA_IDS es un filtro ADICIONAL solo dentro de la
   rama SUPPORT, para no tocar esa clasificacion existente. Mismo props
   signature para las cinco, asi los callers existentes
   (OperatingFloorPlan.jsx, CentroTrabajoPage.jsx) no cambian su propia
   logica de estado.

   2026-08-27 (a peticion explicita del usuario): Anterior/Siguiente
   entre Work Centers. AreaDetail es el UNICO lugar que calcula
   previous/next (via getWorkCenterNavContext, catalog.js) y los pasa
   como props a quien corresponda -- ninguna de las vistas de detalle
   decide su propia navegacion. `onNavigate` lo recibe de su propio
   padre (CentroTrabajoPage.jsx/OperatingFloorPlan.jsx, ambos usando el
   mismo useSelectedWorkCenter -- ver ese archivo). ───────────────────────────────────────────── */
export default function AreaDetail({ workCenterId, open, onClose, onNavigate }) {
  const variant = workCenterId ? getAreaDetailVariant(workCenterId) : null
  const { previous, next } = workCenterId
    ? getWorkCenterNavContext(workCenterId)
    : { previous: null, next: null }
  const navProps = { previous, next, onNavigate }

  if (variant === AREA_DETAIL_VARIANTS.OPERATIONAL) {
    return (
      <OperationalAreaDetail
        workCenterId={workCenterId}
        open={open}
        onClose={onClose}
        {...navProps}
      />
    )
  }
  if (variant === AREA_DETAIL_VARIANTS.SUPPORT) {
    if (SPECIAL_AREA_IDS.has(canonicalOperationalAreaId(workCenterId))) {
      return (
        <SpecialAreaDetail
          workCenterId={workCenterId}
          open={open}
          onClose={onClose}
          {...navProps}
        />
      )
    }
    return (
      <SupportAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
    )
  }
  if (variant === AREA_DETAIL_VARIANTS.LINE_LIKE) {
    return (
      <LineLikeAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
    )
  }
  // LINE: unica variante restante -- WC LINEA 0-10, diseño intacto.
  return (
    <LineDetailDrawer workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
  )
}
