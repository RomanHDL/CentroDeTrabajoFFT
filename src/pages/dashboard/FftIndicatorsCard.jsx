import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import SpeedIcon from '@mui/icons-material/Speed'
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import { usePageStyles } from '../../ui/pageStyles'
import { FFT_INDICATORS } from '../../data/production/catalog'

const ICONS = {
  EFICIENCIA: SpeedIcon,
  DEMORAS: HourglassBottomIcon,
  PRODUCCION: PrecisionManufacturingIcon,
  CUMPLIMIENTO_PROGRAMAS: FactCheckIcon,
}

/* "Indicadores FFT" (2026-08-26, a peticion explicita del usuario) --
   orden oficial 1-4 desde FFT_INDICATORS (catalog.js, UNICA fuente,
   nunca reordenar). Hoy NINGUNO tiene fuente real de datos (verificado
   antes de implementar, ver FFT_INDICATORS/hasSource) -- se muestra
   "Sin fuente de datos configurada" para los 4, NUNCA un porcentaje
   inventado. El componente ya esta preparado para conectarse: el dia
   que un indicador tenga fuente real, basta con `hasSource:true` +
   un `value` real en catalog.js, sin tocar este archivo. */
function IndicatorRow({ indicator }) {
  const Icon = ICONS[indicator.id] || SpeedIcon
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ py: 1 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          color: 'text.secondary',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
          {indicator.order}. {indicator.label}
        </Typography>
        {indicator.hasSource ? (
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{indicator.value}</Typography>
        ) : (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontStyle: 'italic' }}>
            Sin fuente de datos configurada
          </Typography>
        )}
      </Box>
    </Stack>
  )
}

export default function FftIndicatorsCard() {
  const ps = usePageStyles()
  return (
    <Paper elevation={0} sx={{ ...ps.card, height: '100%' }}>
      <Box sx={ps.cardHeader}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={ps.cardHeaderTitle}>Indicadores FFT</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>
            Eficiencia, demoras, producción y cumplimiento de programas del área
          </Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2, pt: 0.5 }}>
        <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
          {FFT_INDICATORS.map((i) => (
            <IndicatorRow key={i.id} indicator={i} />
          ))}
        </Stack>
      </Box>
    </Paper>
  )
}
