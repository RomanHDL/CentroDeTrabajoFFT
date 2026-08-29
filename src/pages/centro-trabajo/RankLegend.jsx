import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import { PERSONNEL_RANK_ORDER } from '../../data/personnel/rankSystem'

/* Leyenda compacta de la jerarquia de rango (2026-08-27, a peticion
   explicita del usuario) -- solo se usa en areas LINE_LIKE (Familia C),
   ver LineDetailDrawer.jsx. Una sola linea, se envuelve sola en pantallas
   angostas -- nunca ocupa una seccion propia grande. */
export default function RankLegend() {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  return (
    <Stack
      direction="row"
      spacing={1.25}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ px: 2, pb: 1.5 }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        Jerarquía:
      </Typography>
      {PERSONNEL_RANK_ORDER.map((rank) => (
        <Stack key={rank.key} direction="row" spacing={0.5} alignItems="center">
          <Box
            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: rank.color, flexShrink: 0 }}
          />
          <Typography
            sx={{ fontSize: 10.5, fontWeight: 600, color: d ? 'text.secondary' : 'text.secondary' }}
          >
            {rank.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}
