import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import PriorityHighIcon from '@mui/icons-material/PriorityHigh'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'

const TONE = {
  bad: { color: '#EF4444', Icon: PriorityHighIcon },
  warn: { color: '#F59E0B', Icon: WarningAmberIcon },
  ok: { color: '#10B981', Icon: CheckCircleIcon },
  info: { color: '#3B82F6', Icon: InfoIcon },
}

/* "Hallazgos del día" -- reglas deterministicas (dashboardMetrics.js),
   NUNCA texto generado por IA (Parte 21 del prompt). Iconos circulares
   de color + texto corto en 2 líneas (Parte 23), máximo 6 filas, en 2
   columnas cuando hay espacio para no alargar la card verticalmente. */
export default function FindingsCard({ findings }) {
  const ps = usePageStyles()
  return (
    <Paper elevation={0} sx={{ ...ps.card, height: '100%' }}>
      <Box sx={ps.cardHeader}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <LightbulbIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
          <Typography sx={ps.cardHeaderTitle}>Hallazgos del día</Typography>
        </Box>
      </Box>
      <Box sx={{ p: 2 }}>
        {findings.length === 0 ? (
          <EmptyState
            compact
            title="Sin hallazgos por ahora"
            description="No hay condiciones destacables con los datos actuales."
          />
        ) : (
          <Grid container spacing={1.25}>
            {findings.map((f) => {
              const { color, Icon } = TONE[f.tone] || TONE.info
              return (
                <Grid item xs={12} sm={6} key={f.id}>
                  <Stack direction="row" spacing={1.1} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flexShrink: 0,
                        mt: 0.1,
                        bgcolor: alpha(color, 0.14),
                        display: 'grid',
                        placeItems: 'center',
                        color,
                      }}
                    >
                      <Icon sx={{ fontSize: 15 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>
                        {f.title}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3 }}>
                        {f.detail}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              )
            })}
          </Grid>
        )}
      </Box>
    </Paper>
  )
}
