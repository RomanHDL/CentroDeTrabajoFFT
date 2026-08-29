import React from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'

const ACCENT_HEX = { blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', red: '#EF4444', slate: '#64748B' }

export default function LineCard({ summary, onOpen }) {
  const ps = usePageStyles()
  const accentColor = ACCENT_HEX[summary.tone.accent] || ACCENT_HEX.slate
  const pct = summary.pct ?? 0

  return (
    <Paper
      elevation={0}
      onClick={() => onOpen(summary.id)}
      sx={{
        ...ps.kpiCard(summary.tone.accent),
        cursor: 'pointer',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minHeight: 190,
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Typography sx={{ fontWeight: 800, fontSize: 17, color: 'text.primary', letterSpacing: -0.3 }}>
          {summary.name}
        </Typography>
        <Box sx={{
          width: 9, height: 9, borderRadius: '50%', mt: 0.6, flexShrink: 0,
          bgcolor: summary.status.dot,
          boxShadow: `0 0 0 3px ${alpha(summary.status.dot, 0.18)}`,
        }} />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
        <PeopleAltIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>
          {summary.personnel} / {summary.capacityTotal} personas
        </Typography>
        <Chip
          size="small"
          label={summary.status.label}
          sx={{
            height: 20, fontSize: 10.5, fontWeight: 700,
            bgcolor: alpha(summary.status.dot, 0.10),
            color: summary.status.dot,
            border: `1px solid ${alpha(summary.status.dot, 0.22)}`,
          }}
        />
      </Stack>

      {summary.stationsAvailable > 0 && (
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#B45309' }}>
          ⚠ {summary.stationsAvailable} estación{summary.stationsAvailable !== 1 ? 'es' : ''} disponible{summary.stationsAvailable !== 1 ? 's' : ''}
        </Typography>
      )}

      {summary.target == null ? (
        <Box sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontStyle: 'italic' }}>
            Sin datos de producción todavía
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 0.5 }}>
          <Stack direction="row" alignItems="baseline" spacing={0.75}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>
              {summary.production.toLocaleString('es-MX')}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>
              / {summary.target.toLocaleString('es-MX')} piezas
            </Typography>
          </Stack>

          <Box sx={{ mt: 1 }}>
            <Box sx={ps.progressBar}>
              <Box sx={{ ...ps.progressFill(pct, accentColor), bgcolor: accentColor }} />
            </Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                {pct}% — {summary.tone.label}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                +{summary.ultimaHora} última hora
              </Typography>
            </Stack>
          </Box>
        </Box>
      )}
    </Paper>
  )
}
