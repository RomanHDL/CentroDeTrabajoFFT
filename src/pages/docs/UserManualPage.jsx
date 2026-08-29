import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { Link } from 'react-router-dom'
import { MODULES, FAQ } from './userManualData'

// User Manual (MI Stack Reference, sección 17a, HARD RULE) -- ruta real,
// contenido genuino del estado actual de cada módulo. Ver userManualData.js.
export default function UserManualPage() {
  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
        Manual de Usuario
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3 }}>
        Cómo usar Centro de Trabajo FFT. <Link to="/developer-manual">Ver el Developer Manual</Link>
        .
      </Typography>

      {MODULES.map((mod) => (
        <Paper key={mod.name} sx={{ p: 2.5, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{mod.name}</Typography>
            <Chip
              size="small"
              label={mod.status}
              color={mod.status === 'disponible' ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
          <Typography sx={{ whiteSpace: 'pre-line', fontSize: 14 }}>{mod.body}</Typography>
        </Paper>
      ))}

      <Typography variant="h6" sx={{ fontWeight: 700, mt: 3, mb: 1.5 }}>
        Preguntas frecuentes
      </Typography>
      {FAQ.map(([q, a]) => (
        <Paper key={q} sx={{ p: 2.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>{q}</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{a}</Typography>
        </Paper>
      ))}
    </Box>
  )
}
