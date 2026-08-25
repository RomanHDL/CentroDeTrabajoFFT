import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { getAvailablePersonnelToday } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import AvailablePersonnelTray from './AvailablePersonnelTray'

/* "Personal disponible para asignar" -- envuelve el AvailablePersonnelTray
   YA existente (fuente de drag&drop compartida con LineDetailDrawer, sin
   tocar su logica) con el titulo/subtitulo del mockup nuevo -- hideTitle
   evita duplicar el conteo, que ya se muestra aqui arriba. */
export default function AvailablePersonnelCard() {
  const version = usePersonnelVersion()
  const count = getAvailablePersonnelToday().length
  // eslint-disable-next-line no-unused-expressions
  version
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ mb: 1.25 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Personal disponible para asignar ({count})</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Personal activo disponible para asignación a áreas</Typography>
      </Box>
      <AvailablePersonnelTray hideTitle />
    </Paper>
  )
}
