import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import { COLOR_GROUPS } from '../../data/production/layoutZones'
import { getAllAreaSummaries, getStaffingTotals } from '../../data/production/personnelByArea'

const VISIBLE_LIMIT = 8

/* ─────────────────────────────────────────────
   "Total general" + "Resumen por area" — todos los numeros vienen
   de getAllAreaSummaries()/getStaffingTotals() (personnelByArea.js),
   nunca hardcodeados aqui: si cambia la fuente de datos, estas
   cards cambian solas. El total general solo suma areas con
   plantilla oficial definida (coincide exactamente con la tabla
   IDEAL/REAL/DIFERENCIA proporcionada).
   ───────────────────────────────────────────── */
export default function AreaSummaryStrip({ onSelectArea }) {
  const [showAll, setShowAll] = useState(false)
  const summaries = useMemo(() => getAllAreaSummaries(), [])
  const totals = useMemo(() => getStaffingTotals(), [])
  const withPeople = summaries.filter((s) => s.count > 0)
  const visible = showAll ? summaries : withPeople.slice(0, VISIBLE_LIMIT)

  return (
    <Box sx={{ mt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Total general de plantilla</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Suma de todas las áreas con plantilla oficial definida</Typography>
        </Box>
      </Stack>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.25} sx={{ mb: 3 }}>
        <TotalCard label="Plantilla ideal" value={totals.idealTotal} accent="#3B82F6" />
        <TotalCard label="Personal actual" value={totals.realTotal} accent="#10B981" />
        <TotalCard label="Faltante" value={Math.abs(totals.diff)} accent={totals.diff < 0 ? '#EF4444' : '#10B981'} />
        <TotalCard
          label="Cobertura"
          value={totals.coveragePct != null ? `${totals.realTotal} / ${totals.idealTotal} · ${totals.coveragePct}%` : 'Sin datos'}
          accent="#A855F7"
          wide
        />
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Resumen por área</Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Personal actual frente a la plantilla ideal, por área</Typography>
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
          const ideal = s.ideal ?? null
          const hasIdeal = ideal != null
          const complete = hasIdeal && s.count >= ideal
          const missing = hasIdeal ? ideal - s.count : 0
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
              <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 0.25 }}>
                {hasIdeal ? `${s.count} / ${ideal}` : s.count}
              </Typography>
              {hasIdeal ? (
                <Typography sx={{ fontSize: 10.5, color: complete ? '#10B981' : '#EF4444', fontWeight: 700 }}>
                  {complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 10.5, color: s.count > 0 ? '#10B981' : 'text.secondary', fontWeight: 700 }}>
                  {s.count > 0 ? 'Con personal' : 'Sin plantilla definida'}
                </Typography>
              )}
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}

function TotalCard({ label, value, accent, wide }) {
  return (
    <Paper
      elevation={0}
      sx={{
        minWidth: wide ? 200 : 130, flex: wide ? '1 1 220px' : '1 1 130px', p: 1.5, borderRadius: 2,
        border: '1px solid', borderColor: 'divider', borderTop: `3px solid ${accent}`,
      }}
    >
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 19, mt: 0.25 }}>{value}</Typography>
    </Paper>
  )
}
