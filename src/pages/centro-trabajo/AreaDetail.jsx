import { getAreaDetailVariant, AREA_DETAIL_VARIANTS, getWorkCenterNavContext } from '../../data/production/catalog'
import LineDetailDrawer from './LineDetailDrawer'
import LineLikeAreaDetail from './LineLikeAreaDetail'
import OperationalAreaDetail from './OperationalAreaDetail'
import SupportAreaDetail from './SupportAreaDetail'

/* ─────────────────────────────────────────────
   Punto UNICO de decision (2026-08-25/26, a peticion explicita del
   usuario: "NO uses cientos de if (name === ...) por toda la
   aplicacion") entre las CUATRO familias de detalle de area:

   - LineDetailDrawer (SIN CAMBIOS, ni antes ni en el rediseño
     2026-08-28): CT LINEA 1..10 + CT LINEA 0/Proyecto. Ya nadie le pasa
     lineLike=true -- desde este cambio ese prop siempre es false aqui.
   - LineLikeAreaDetail (NUEVO, 2026-08-28, "rediseño tablero operativo",
     a peticion explicita del usuario): Paletizado/Accesorios/Insumos/
     Midea/Conveyor General (catalog.js/LINE_LIKE_AREA_IDS) -- antes
     reutilizaba LineDetailDrawer con lineLike=true, ahora tiene su
     propio componente separado para poder rediseñarlo sin arriesgar
     absolutamente nada del diseño de WC LINEA (que nunca pasa por este
     branch nuevo).
   - OperationalAreaDetail (mockup "CT Accesorios"): areas productivas
     reales (catalog.js/OPERATIONAL_DETAIL_AREA_IDS) -- hoy vacio en la
     practica, se deja tal cual.
   - SupportAreaDetail (mockup "CT Capacitación"): Capacitacion,
     Team Leader, Entrenador, Soporte, Limpieza, Gerente, Supervisor,
     Calidad -- SIN CAMBIOS.

   getAreaDetailVariant(workCenterId) (catalog.js) es la UNICA fuente de
   esta clasificacion -- este archivo solo la consume. Mismo props
   signature (workCenterId/open/onClose) para las cuatro, asi los callers
   existentes (OperatingFloorPlan.jsx, CentroTrabajoPage.jsx) no cambian
   su propia logica de estado.

   2026-08-27 (a peticion explicita del usuario): Anterior/Siguiente
   entre Work Centers. AreaDetail es el UNICO lugar que calcula
   previous/next (via getWorkCenterNavContext, catalog.js) y los pasa
   como props a quien corresponda -- ninguna de las vistas de detalle
   decide su propia navegacion. `onNavigate` lo recibe de su propio
   padre (CentroTrabajoPage.jsx/OperatingFloorPlan.jsx, ambos usando el
   mismo useSelectedWorkCenter -- ver ese archivo). ───────────────────────────────────────────── */
export default function AreaDetail({ workCenterId, open, onClose, onNavigate }) {
  const variant = workCenterId ? getAreaDetailVariant(workCenterId) : null
  const { previous, next } = workCenterId ? getWorkCenterNavContext(workCenterId) : { previous: null, next: null }
  const navProps = { previous, next, onNavigate }

  if (variant === AREA_DETAIL_VARIANTS.OPERATIONAL) {
    return <OperationalAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
  }
  if (variant === AREA_DETAIL_VARIANTS.SUPPORT) {
    return <SupportAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
  }
  if (variant === AREA_DETAIL_VARIANTS.LINE_LIKE) {
    return <LineLikeAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
  }
  // LINE: unica variante restante -- WC LINEA 0-10, diseño intacto.
  return <LineDetailDrawer workCenterId={workCenterId} open={open} onClose={onClose} {...navProps} />
}
