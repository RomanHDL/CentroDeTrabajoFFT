import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import ClearLayoutPanel from './ClearLayoutPanel'
import RestoreLayoutPanel from './RestoreLayoutPanel'

/* "Herramientas administrativas" -- agrupa visualmente Vaciar/Restaurar
   layout (2026-08-25, rediseño del modulo Usuarios): son acciones de
   mantenimiento del layout de planta, sin relacion con el sistema de
   permisos, asi que se separan de "Gestion de permisos" en su propia card,
   debajo. La logica de cada panel (confirmacion, suppressBaselinePlacement/
   restoreBaselinePlacement) NO se toca -- solo cambia el contenedor visual. */
export default function AdminToolsCard() {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mt: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 0.5 }}>Herramientas administrativas</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Acciones de mantenimiento del layout visual de planta -- no afectan permisos, usuarios ni datos históricos.
      </Typography>
      <Stack spacing={2}>
        <ClearLayoutPanel />
        <RestoreLayoutPanel />
      </Stack>
    </Paper>
  )
}
