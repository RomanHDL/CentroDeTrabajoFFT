import AreaCoverageSummaryCard from './AreaCoverageSummaryCard'
import CriticalAreasCard from './CriticalAreasCard'

/* ─────────────────────────────────────────────
   Rediseño 2026-08-25 (a peticion explicita del usuario, mockup
   proporcionado) -- EXCLUSIVO de la seccion que va DESPUES de la card
   "Layout operativo del área" en AreasLayoutView.jsx. El layout
   (WorkAreaMap) es intocable y no vive en este archivo.

   2026-08-27 (a peticion explicita del usuario): "Resumen general de
   plantilla" (StaffingOverviewCard) se movio al Dashboard -- ya no se
   duplica aqui. "Personal disponible para asignar" (AvailablePersonnelCard,
   la card GENERAL de esta zona resumen) se elimino -- esa funcionalidad
   sigue viva donde SI hace falta (AvailablePersonnelTray dentro de cada
   WC LINEA, y el flujo de Registrar personal), solo se quito la card
   general redundante de aqui.

   2026-08-30 (a peticion explicita del usuario): "Personal sin area
   asignada" (UnassignedPersonnelCard) se quita de ESTA pantalla -- el
   componente y getPeopleWithoutArea() (AreasLayoutView.jsx) NO se
   borraron, esa funcionalidad sigue intacta donde si se necesite (p.ej.
   Personal); simplemente ya no se monta aqui. En su lugar va
   "Areas criticas" (CriticalAreasCard), mismo slot/proporcion 8fr/4fr. */
export default function WorkAreaBottomSummary({ onSelectArea }) {
  return (
    <div className="mt-1 grid grid-cols-1 gap-4 md:grid-cols-[8fr_4fr] lg:grid-cols-[8.2fr_3.8fr]">
      <div className="min-w-0">
        <AreaCoverageSummaryCard onSelectArea={onSelectArea} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-col gap-3.5">
          <CriticalAreasCard />
        </div>
      </div>
    </div>
  )
}
