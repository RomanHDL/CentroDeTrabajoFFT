import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import { WORK_CENTERS } from '../../data/production/catalog'
import { getPeopleByArea } from '../../data/production/personnelByArea'

/* Lineas internas de FFT (LINEA0..LINEA10) — el resto de las areas
   (Cajas, Accesorios, Paletizado, etc.) no son "lineas" sino areas
   de proceso; esas viven en la pestaña Areas de trabajo. */
export default function LineasTab({ onOpenLine }) {
  const peopleByArea = useMemo(() => getPeopleByArea(), [])
  const lineas = WORK_CENTERS.filter((w) => w.kind === 'linea')

  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
        Líneas internas de FFT ({lineas.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {lineas.map((linea) => {
          const count = peopleByArea[linea.id]?.length || 0
          return (
            <Paper
              key={linea.id}
              elevation={0}
              onClick={() => onOpenLine?.(linea.id)}
              sx={{
                minWidth: 170, flex: '1 1 170px', maxWidth: 220, p: 1.5, borderRadius: 2,
                border: '1px solid', borderColor: 'divider', cursor: 'pointer',
                transition: 'transform .15s ease',
                '&:hover': { transform: 'translateY(-2px)', borderColor: '#3B82F6' },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{linea.name}</Typography>
                <Chip
                  size="small"
                  label={count > 0 ? 'Activa' : 'Sin personal'}
                  sx={{
                    height: 18, fontSize: 10, fontWeight: 700,
                    bgcolor: alpha(count > 0 ? '#10B981' : '#94A3B8', 0.12),
                    color: count > 0 ? '#10B981' : '#64748B',
                  }}
                />
              </Stack>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                {count} trabajador{count === 1 ? '' : 'es'}
              </Typography>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}
