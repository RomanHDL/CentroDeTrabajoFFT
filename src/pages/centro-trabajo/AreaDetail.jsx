import { getAreaDetailVariant, AREA_DETAIL_VARIANTS } from '../../data/production/catalog'
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
   su propia logica de estado. ───────────────────────────────────────────── */
export default function AreaDetail({ workCenterId, open, onClose }) {
  const variant = workCenterId ? getAreaDetailVariant(workCenterId) : null

  if (variant === AREA_DETAIL_VARIANTS.OPERATIONAL) {
    return <OperationalAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} />
  }
  if (variant === AREA_DETAIL_VARIANTS.SUPPORT) {
    return <SupportAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} />
  }
  return <LineDetailDrawer workCenterId={workCenterId} open={open} onClose={onClose} />
}
