import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import { WORK_CENTERS, hasLineStations } from '../../data/production/catalog'
import { getAreaStaffing } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useEmployeeDropTarget } from '../../ui/dnd'

/* Lineas reales de FFT (Linea 1-10) — el resto de las areas
   (Cajas, Accesorios, Paletizado, Linea de proyecto, etc.) no son
   "lineas" sino areas de proceso con su propia forma de operar;
   esas viven en la pestaña Areas de trabajo. */
export default function LineasTab({ onOpenLine }) {
  const version = usePersonnelVersion()
  const lineas = useMemo(() => WORK_CENTERS.filter((w) => hasLineStations(w.id)), [])

  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
        Líneas de producción FFT ({lineas.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {lineas.map((linea) => (
          <LineaCard key={linea.id} linea={linea} version={version} onOpenLine={onOpenLine} />
        ))}
      </Box>
    </Box>
  )
}

function LineaCard({ linea, onOpenLine }) {
  const staffing = getAreaStaffing(linea.id)
  const complete = staffing.status === 'COMPLETA'
  const missing = staffing.ideal - staffing.real
  const { isOver, dropProps } = useEmployeeDropTarget(linea.id)
  return (
    <Paper
      {...dropProps}
      elevation={0}
      onClick={() => onOpenLine?.(linea.id)}
      sx={{
        minWidth: 170, flex: '1 1 170px', maxWidth: 220, p: 1.5, borderRadius: 2,
        border: '1px solid', borderColor: isOver ? '#3B82F6' : 'divider', cursor: 'pointer',
        bgcolor: (t) => (isOver ? alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08) : 'transparent'),
        transition: 'all .15s ease',
        '&:hover': { transform: 'translateY(-2px)', borderColor: '#3B82F6' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{linea.name}</Typography>
        <Chip
          size="small"
          label={complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`}
          sx={{
            height: 18, fontSize: 10, fontWeight: 700,
            bgcolor: complete ? '#10B98122' : '#EF444422',
            color: complete ? '#10B981' : '#EF4444',
          }}
        />
      </Stack>
      <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 0.5 }}>
        {staffing.real} / {staffing.ideal}
      </Typography>
      {isOver && (
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', mt: 0.5 }}>Soltar para elegir estación</Typography>
      )}
    </Paper>
  )
}
