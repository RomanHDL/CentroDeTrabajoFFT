import React from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'

const LEVEL_COLOR = { bad: '#EF4444', warn: '#F59E0B', ok: '#10B981' }

export default function AlertsPanel({ alerts }) {
  const ps = usePageStyles()

  return (
    <Paper elevation={0} sx={{ ...ps.card, height: '100%' }}>
      <Box sx={ps.cardHeader}>
        <Typography sx={ps.cardHeaderTitle}>Alertas</Typography>
        <Typography sx={ps.cardHeaderSubtitle}>{alerts.length} eventos</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {alerts.length === 0 ? (
          <EmptyState compact title="Sin alertas" description="Todas las líneas dentro de rango esperado." />
        ) : (
          <Stack spacing={1}>
            {alerts.map((a, idx) => {
              const color = LEVEL_COLOR[a.level] || LEVEL_COLOR.warn
              const Icon = a.level === 'ok' ? CheckCircleIcon : WarningAmberIcon
              return (
                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start" sx={{
                  p: 1.1, borderRadius: 2, bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.18)}`,
                }}>
                  <Icon sx={{ fontSize: 17, color, mt: 0.15 }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary' }}>{a.text}</Typography>
                </Stack>
              )
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  )
}
