import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { alpha } from '@mui/material/styles'
import { getAllAreaSummaries } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'

const VISIBLE_LIMIT = 8

/* "Resumen por area" -- mismos datos de siempre (getAllAreaSummaries,
   personnelByArea.js), restylado a mini-cards uniformes con barra de
   cobertura (antes no la tenian) -- a peticion explicita del usuario
   (2026-08-25). Antes vivia junto al resumen general dentro de
   AreaSummaryStrip.jsx (ya no existe, se dividio en 2 componentes). */
export default function AreaCoverageSummaryCard({ onSelectArea }) {
  const [showAll, setShowAll] = useState(false)
  const version = usePersonnelVersion()
  const summaries = useMemo(() => getAllAreaSummaries(), [version])
  const withPeople = summaries.filter((s) => s.count > 0)
  const visible = showAll ? summaries : withPeople.slice(0, VISIBLE_LIMIT)

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>Resumen por área</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Personal actual frente a la plantilla ideal, por área</Typography>
        </Box>
        {(summaries.length > visible.length || showAll) && (
          <Button size="small" endIcon={<ChevronRightIcon fontSize="small" />} onClick={() => setShowAll((v) => !v)} sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}>
            {showAll ? 'Ver menos' : 'Ver todas las áreas'}
          </Button>
        )}
      </Stack>

      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } }}>
        {visible.map((s) => {
          const ideal = s.ideal ?? null
          const hasIdeal = ideal != null && ideal > 0
          const complete = hasIdeal && s.count >= ideal
          const missing = hasIdeal ? ideal - s.count : 0
          const pct = hasIdeal ? (s.count / ideal) * 100 : null
          const barPct = pct != null ? Math.min(pct, 100) : 0
          const color = !hasIdeal ? (s.count > 0 ? '#10B981' : '#94A3B8') : (complete ? '#10B981' : '#EF4444')
          return (
            <Box
              key={s.id}
              onClick={() => onSelectArea(s.id)}
              sx={{
                p: 1.25, borderRadius: 2, cursor: 'pointer', minWidth: 0,
                border: '1px solid', borderColor: 'divider', borderLeft: `3px solid ${color}`,
                transition: 'transform .15s ease, box-shadow .15s ease',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(16,24,40,0.06)' },
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 12.5 }} noWrap>{s.name}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 16, mt: 0.15 }}>
                {hasIdeal ? `${s.count} / ${ideal}` : s.count}
              </Typography>
              <Typography sx={{ fontSize: 10, color, fontWeight: 700, mb: 0.5 }}>
                {hasIdeal ? (complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`) : (s.count > 0 ? 'Con personal' : 'Sin plantilla')}
              </Typography>
              {hasIdeal ? (
                <Stack direction="row" alignItems="center" spacing={0.6}>
                  <Box sx={{ flex: 1, height: 5, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ width: `${barPct}%`, height: '100%', bgcolor: color, borderRadius: 999 }} />
                  </Box>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color, flexShrink: 0 }}>{pct.toFixed(1)}%</Typography>
                </Stack>
              ) : (
                <Box sx={{ height: 5, borderRadius: 999, bgcolor: alpha(color, 0.15) }} />
              )}
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
