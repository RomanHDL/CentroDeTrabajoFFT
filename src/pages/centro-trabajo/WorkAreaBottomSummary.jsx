import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import StaffingOverviewCard from './StaffingOverviewCard'
import AreaCoverageSummaryCard from './AreaCoverageSummaryCard'
import UnassignedPersonnelCard from './UnassignedPersonnelCard'
import AvailablePersonnelCard from './AvailablePersonnelCard'

/* ─────────────────────────────────────────────
   Rediseño 2026-08-25 (a peticion explicita del usuario, mockup
   proporcionado) -- EXCLUSIVO de la seccion que va DESPUES de la card
   "Layout operativo del área" en AreasLayoutView.jsx. El layout
   (WorkAreaMap) es intocable y no vive en este archivo.

   Antes esta seccion era: AvailablePersonnelTray suelto, luego
   AreaSummaryStrip (resumen general + resumen por area juntos), luego
   un Paper de "Personal sin area" con chips de texto siempre visibles
   al expandir. Ahora es una composicion de 2 columnas (izquierda
   ~65-70%: Resumen general de plantilla + Resumen por area; derecha
   ~30-35%: Personal sin area asignada + Personal disponible), sin
   ninguna fuente de datos nueva -- cada card sigue llamando
   exactamente los mismos selectors de personnelByArea.js/repository.js
   que ya se usaban antes de este cambio. */
export default function WorkAreaBottomSummary({ onSelectArea, sinZona }) {
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12} md={8} lg={8.2} sx={{ minWidth: 0 }}>
        <StaffingOverviewCard />
        <AreaCoverageSummaryCard onSelectArea={onSelectArea} />
      </Grid>
      <Grid item xs={12} md={4} lg={3.8} sx={{ minWidth: 0 }}>
        <Stack spacing={1.75}>
          <UnassignedPersonnelCard people={sinZona} />
          <AvailablePersonnelCard />
        </Stack>
      </Grid>
    </Grid>
  )
}
