import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { usePageStyles } from '../../ui/pageStyles'

/* ─────────────────────────────────────────────
   "Resumen del área" (2026-08-28, "REFINAMIENTO VISUAL Grupo C", a
   peticion explicita del usuario, Seccion 13C) -- SOLO la usa
   LineLikeAreaDetail.jsx. `groups` = los mismos `stationGroups` ya
   calculados ahi (getPersonnelRank/rankSystem.js, cada grupo con su
   `label` de categoria y sus estaciones reales) -- nunca un calculo
   paralelo. `total`/`ideal`/`diff` = los mismos numeros que ya muestran
   los KPIs de arriba (staffing.real/ideal/diff), nunca inventados aqui. */
export default function AreaStaffSummary({ groups, total, ideal, diff }) {
  const ps = usePageStyles()
  return (
    <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
      <Typography sx={{ ...ps.sectionTitle, fontSize: 13.5, mb: 1.25 }}>Resumen del área</Typography>
      <Stack spacing={0.85}>
        {groups.map((g) => (
          <Stack key={g.key} direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: g.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12.5, flex: 1 }} noWrap>{g.label}</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{g.occupied} / {g.total}</Typography>
          </Stack>
        ))}
      </Stack>
      {ideal != null && (
        <>
          <Divider sx={{ my: 1.25 }} />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>Total asignado</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{total} / {ideal}</Typography>
          </Stack>
          {diff < 0 && (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <Typography sx={{ fontSize: 12, color: '#EF4444', flex: 1 }}>Faltan por cubrir</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>{Math.abs(diff)}</Typography>
            </Stack>
          )}
        </>
      )}
    </Paper>
  )
}
