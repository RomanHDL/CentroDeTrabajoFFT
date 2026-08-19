import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import { COLOR_GROUPS } from '../../data/production/layoutZones'
import { getAllAreaSummaries } from '../../data/production/personnelByArea'

const VISIBLE_LIMIT = 8

/* ─────────────────────────────────────────────
   "Resumen por area" — cards pequeñas horizontales, una por area
   real del catalogo (FFT se muestra como un solo bloque). Todos
   los conteos vienen de getAllAreaSummaries() (personnelByArea.js),
   nunca hardcodeados aqui: si mañana cambia la fuente de datos,
   estas cards cambian solas.
   ───────────────────────────────────────────── */
export default function AreaSummaryStrip({ onSelectArea }) {
  const [showAll, setShowAll] = useState(false)
  const summaries = useMemo(() => getAllAreaSummaries(), [])
  const withPeople = summaries.filter((s) => s.count > 0)
  const visible = showAll ? summaries : withPeople.slice(0, VISIBLE_LIMIT)

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Resumen por área</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Estado actual y cantidad de personas por área</Typography>
        </Box>
        {summaries.length > visible.length || showAll ? (
          <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {showAll ? 'Ver menos' : 'Ver todas las áreas'}
          </Button>
        ) : null}
      </Stack>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
        {visible.map((s) => {
          const color = COLOR_GROUPS[s.group]?.color || '#64748B'
          return (
            <Paper
              key={s.id}
              elevation={0}
              onClick={() => onSelectArea(s.id)}
              sx={{
                minWidth: 140, flex: '1 1 140px', maxWidth: 190, p: 1.5, borderRadius: 2, cursor: 'pointer',
                border: '1px solid', borderColor: 'divider', borderLeft: `3px solid ${color}`,
                transition: 'transform .15s ease',
                '&:hover': { transform: 'translateY(-2px)', bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.06 : 0.04) },
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{s.name}</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 0.25 }}>{s.count}</Typography>
              <Typography sx={{ fontSize: 10.5, color: s.count > 0 ? '#10B981' : 'text.secondary', fontWeight: 700 }}>
                {s.count > 0 ? 'Con personal' : 'Sin personal'}
              </Typography>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}
