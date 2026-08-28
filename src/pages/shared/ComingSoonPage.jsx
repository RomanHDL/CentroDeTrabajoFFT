import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import ConstructionIcon from '@mui/icons-material/Construction'
import { usePageStyles } from '../../ui/pageStyles'
import EmptyState from '../../ui/EmptyState'

/* Modulo "solo navegacion" (2026-08-28, a peticion explicita del usuario):
   KPI's / Asistencia / Auditoria se agregan al registro/rutas/sidebar
   YA, pero su contenido real todavia no se construye -- "por ahora no
   desarrollar el contenido... solo crear los modulos/rutas necesarias
   para poder acceder a ellos". Un solo componente compartido (reutiliza
   EmptyState/usePageStyles, mismo encabezado que el resto de paginas)
   para no triplicar el mismo marcado en 3 archivos -- cada pagina real
   solo le pasa su titulo. */
export default function ComingSoonPage({ title }) {
  const ps = usePageStyles()
  return (
    <Box sx={ps.page}>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={ps.pageTitle}>{title}</Typography>
      </Box>
      <Paper elevation={0} sx={{ ...ps.card, maxWidth: 520, mx: 'auto' }}>
        <EmptyState
          icon={<ConstructionIcon />}
          title="Trabajando en ello"
          description="Este módulo se encuentra actualmente en desarrollo."
        />
      </Paper>
    </Box>
  )
}
