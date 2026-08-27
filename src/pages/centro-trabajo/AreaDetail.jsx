import { getAreaDetailVariant, AREA_DETAIL_VARIANTS, getWorkCenterNavContext } from '../../data/production/catalog'
import LineDetailDrawer from './LineDetailDrawer'
import OperationalAreaDetail from './OperationalAreaDetail'
import SupportAreaDetail from './SupportAreaDetail'

/* ─────────────────────────────────────────────
   Punto UNICO de decision (2026-08-25/26, a peticion explicita del
   usuario: "NO uses cientos de if (name === ...) por toda la
   aplicacion") entre las TRES familias de detalle de area:

   - LineDetailDrawer (existente, SIN CAMBIOS): CT LINEA 1..10 + CT
     LINEA 0/Proyecto.
   - OperationalAreaDetail (mockup "CT Accesorios"): areas productivas
     reales (catalog.js/OPERATIONAL_DETAIL_AREA_IDS).
   - SupportAreaDetail (nuevo, mockup "CT Capacitación"): Capacitacion,
     Team Leader, Soporte, Limpieza, Gerente, Supervisor.

   getAreaDetailVariant(workCenterId) (catalog.js) es la UNICA fuente de
   esta clasificacion -- este archivo solo la consume. Mismo props
   signature (workCenterId/open/onClose) para los tres, asi los callers
   existentes (OperatingFloorPlan.jsx, CentroTrabajoPage.jsx) no cambian
   su propia logica de estado.

   2026-08-27 (a peticion explicita del usuario): Anterior/Siguiente
   entre Work Centers. AreaDetail es el UNICO lugar que calcula
   previous/next (via getWorkCenterNavContext, catalog.js) y los pasa
   como props a quien corresponda -- ninguna de las 3 vistas de detalle
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
  // LINE_LIKE (2026-08-26, WC Midea/High Value): misma experiencia visual
  // de LineDetailDrawer (estaciones/vacantes/buscador/drag&drop), pero
  // `lineLike` le dice al componente que NO es una CT LINEA real -- nunca
  // debe decir "Línea" en su copy (ver LineDetailDrawer.jsx).
  return <LineDetailDrawer workCenterId={workCenterId} open={open} onClose={onClose} lineLike={variant === AREA_DETAIL_VARIANTS.LINE_LIKE} {...navProps} />
}
