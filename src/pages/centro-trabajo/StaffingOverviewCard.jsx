import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PersonIcon from '@mui/icons-material/Person'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import InsightsIcon from '@mui/icons-material/Insights'
import { alpha } from '@mui/material/styles'
import { getStaffingTotals } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'

/* "Resumen general de plantilla" -- 4 KPI compactos dentro de UNA
   sola card (a peticion explicita del usuario, 2026-08-25). Misma
   fuente de siempre (getStaffingTotals, personnelByArea.js) -- antes
   vivia como 4 Paper sueltas dentro de AreaSummaryStrip.jsx, aqui solo
   se restyla, ningun calculo cambia. */
export default function StaffingOverviewCard() {
  const version = usePersonnelVersion()
  const totals = useMemo(() => getStaffingTotals(), [version])
  const faltante = Math.max(-totals.diff, 0)
  const coveragePct = totals.coveragePct

  const kpis = [
    { label: 'Plantilla ideal', value: totals.idealTotal, note: 'Total ideal definida', icon: <PeopleAltIcon />, accent: '#3B82F6' },
    { label: 'Personal actual', value: totals.realTotal, note: 'Personal asignado hoy', icon: <PersonIcon />, accent: '#10B981' },
    { label: 'Faltante', value: faltante, note: 'Personas por asignar', icon: <PersonOffIcon />, accent: '#EF4444' },
    {
      label: 'Cobertura',
      value: coveragePct != null ? `${totals.realTotal} / ${totals.idealTotal} · ${coveragePct}%` : 'Sin datos',
      note: 'Porcentaje de cobertura general', icon: <InsightsIcon />, accent: '#A855F7',
      pct: coveragePct,
    },
  ]

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 1.75 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>Resumen general de plantilla</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5 }}>Suma de todas las áreas con plantilla oficial definida</Typography>
      <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}>
        {kpis.map((k) => (
          <Box
            key={k.label}
            sx={{
              p: 1.25, borderRadius: 2, border: '1px solid', borderColor: alpha(k.accent, 0.18),
              borderLeft: `3px solid ${k.accent}`, bgcolor: (t) => alpha(k.accent, t.palette.mode === 'dark' ? 0.05 : 0.03),
              minWidth: 0,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
              <Box sx={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0, bgcolor: alpha(k.accent, 0.14), color: k.accent,
                display: 'grid', placeItems: 'center', '& .MuiSvgIcon-root': { fontSize: 14 },
              }}>
                {k.icon}
              </Box>
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3 }} noWrap>
                {k.label}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 17, fontWeight: 800, lineHeight: 1.15 }} noWrap>{k.value}</Typography>
            {k.pct != null && (
              <Box sx={{ mt: 0.6, height: 5, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{ width: `${Math.min(k.pct, 100)}%`, height: '100%', bgcolor: k.accent, borderRadius: 999 }} />
              </Box>
            )}
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary', mt: 0.4 }} noWrap>{k.note}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
