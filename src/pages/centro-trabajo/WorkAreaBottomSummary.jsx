import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import AreaCoverageSummaryCard from './AreaCoverageSummaryCard'
import UnassignedPersonnelCard from './UnassignedPersonnelCard'

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
   general redundante de aqui. "Personal sin area asignada" se conserva
   tal cual, a peticion explicita del usuario. */
export default function WorkAreaBottomSummary({ onSelectArea, sinZona }) {
  return (
    <Grid container spacing={2} sx={{ mt: 0.5 }}>
      <Grid item xs={12} md={8} lg={8.2} sx={{ minWidth: 0 }}>
        <AreaCoverageSummaryCard onSelectArea={onSelectArea} />
      </Grid>
      <Grid item xs={12} md={4} lg={3.8} sx={{ minWidth: 0 }}>
        <Stack spacing={1.75}>
          <UnassignedPersonnelCard people={sinZona} />
        </Stack>
      </Grid>
    </Grid>
  )
}
