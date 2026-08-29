import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import RefreshIcon from '@mui/icons-material/Refresh'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'

/* Envoltura comun de las cards de graficas del Dashboard rediseñado
   (2026-08-25) -- header consistente (mismo lenguaje visual que el
   resto del sistema, ps.card/ps.cardHeader) + los 3 estados que pide
   el prompt (Partes 46-48): loading (skeleton con la misma forma,
   nunca pantalla en blanco), error (mensaje + Reintentar, sin tumbar el
   resto del Dashboard) y empty state especifico (nunca ceros
   engañosos). */
export default function ChartCard({
  title,
  subtitle,
  height = 280,
  loading,
  error,
  onRetry,
  empty,
  emptyMessage,
  children,
}) {
  const ps = usePageStyles()
  return (
    <Paper
      elevation={0}
      sx={{ ...ps.card, height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={ps.cardHeader}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={ps.cardHeaderTitle}>{title}</Typography>
          {subtitle && <Typography sx={ps.cardHeaderSubtitle}>{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Stack spacing={1} sx={{ height }}>
            <Skeleton variant="rounded" height="100%" />
          </Stack>
        ) : error ? (
          <Stack
            spacing={1.5}
            alignItems="center"
            justifyContent="center"
            sx={{ height, textAlign: 'center' }}
          >
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              No se pudieron cargar estos datos.
            </Typography>
            {onRetry && (
              <Button
                size="small"
                startIcon={<RefreshIcon fontSize="small" />}
                onClick={onRetry}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Reintentar
              </Button>
            )}
          </Stack>
        ) : empty ? (
          <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState compact title={emptyMessage || 'Sin datos disponibles.'} />
          </Box>
        ) : (
          children
        )}
      </Box>
    </Paper>
  )
}
