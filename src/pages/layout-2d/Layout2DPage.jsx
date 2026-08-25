import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { usePageStyles } from '../../ui/pageStyles'
import OperatingFloorPlan from '../../components/OperatingFloorPlan'

/* Pagina delgada -- toda la logica/visual del plano 2D vive en
   OperatingFloorPlan.jsx (compartido con el Dashboard, ver
   DashboardWorkAreaSection.jsx), para que nunca existan dos versiones
   del mismo plano que se puedan desincronizar. Esta pagina solo le
   pone su propio Paper de pagina completa (Layout 2D es su propio
   modulo, ruta /layout-2d, solo ADMINISTRADOR -- ver Sidebar.jsx). */
export default function Layout2DPage() {
  const ps = usePageStyles()
  return (
    <Box sx={ps.page}>
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <OperatingFloorPlan />
      </Paper>
    </Box>
  )
}
