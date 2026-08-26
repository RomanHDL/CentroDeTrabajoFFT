import { usesOperationalDetail } from '../../data/production/catalog'
import LineDetailDrawer from './LineDetailDrawer'
import OperationalAreaDetail from './OperationalAreaDetail'

/* ─────────────────────────────────────────────
   Punto UNICO de decision (2026-08-25, a peticion explicita del
   usuario: "NO uses cientos de if (name === ...) por toda la
   aplicacion") entre los dos disenos de detalle de area:

   - OperationalAreaDetail (nuevo, mockup "CT Accesorios") para las
     areas productivas listadas en catalog.js/OPERATIONAL_DETAIL_AREA_IDS.
   - LineDetailDrawer (existente, SIN CAMBIOS) para CT LINEA y las
     areas de apoyo/ingenieria (Capacitacion, Team Leader, Soporte,
     Limpieza, Gerente, Supervisor).

   Mismo props signature que LineDetailDrawer (workCenterId/open/onClose)
   para que ambos callers existentes (OperatingFloorPlan.jsx,
   CentroTrabajoPage.jsx) solo cambien el import, sin tocar su propia
   logica de estado. ───────────────────────────────────────────── */
export default function AreaDetail({ workCenterId, open, onClose }) {
  if (workCenterId && usesOperationalDetail(workCenterId)) {
    return <OperationalAreaDetail workCenterId={workCenterId} open={open} onClose={onClose} />
  }
  return <LineDetailDrawer workCenterId={workCenterId} open={open} onClose={onClose} />
}
