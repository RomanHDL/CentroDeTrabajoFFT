import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import StarIcon from '@mui/icons-material/Star'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import GroupsIcon from '@mui/icons-material/Groups'
import SettingsIcon from '@mui/icons-material/Settings'
import PersonIcon from '@mui/icons-material/Person'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { alpha } from '@mui/material/styles'
import { PERSONNEL_RANK_ORDER } from '../../data/personnel/rankSystem'

/* Rediseño "tablero operativo" (2026-08-28, a peticion explicita del
   usuario) -- SOLO lo usa LineLikeAreaDetail.jsx (areas LINE_LIKE:
   Paletizado/Accesorios/Insumos/Midea/Conveyor General). WC LINEA 0-10 y
   las 6 cards de soporte siguen usando su propia experiencia (LineDetailDrawer
   lineLike=false / SupportAreaDetail), nunca este componente.

   `iconKey` (rankSystem.js, campo aditivo) -> icono real de MUI, mapeo
   vive aqui (capa de presentacion), nunca en el archivo de datos. */
export const RANK_ICONS = {
  headChief: WorkspacePremiumIcon,
  gerente: StarIcon,
  supervisor: VerifiedUserIcon,
  teamLeader: GroupsIcon,
  operador: SettingsIcon,
  ayudante: PersonIcon,
  apoyo: FavoriteIcon,
}

export function RankIcon({ rank, size = 15, sx }) {
  const Icon = (rank && RANK_ICONS[rank.iconKey]) || PersonIcon
  return <Icon sx={{ fontSize: size, color: rank?.color || 'text.disabled', ...sx }} />
}

/* `dense`: fila compacta arriba de "Distribución de estaciones" (icono +
   label). `expanded`: lista con descripción corta, para el panel lateral
   de detalle -- mismo dato (PERSONNEL_RANK_ORDER), nunca un segundo mapa
   de texto paralelo. */
export default function HierarchyLegend({ expanded = false }) {
  if (!expanded) {
    return (
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
        <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Jerarquía / Rango
        </Typography>
        {PERSONNEL_RANK_ORDER.map((rank) => (
          <Stack key={rank.key} direction="row" spacing={0.5} alignItems="center">
            <RankIcon rank={rank} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>{rank.label}</Typography>
          </Stack>
        ))}
      </Stack>
    )
  }
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>
        Leyenda de jerarquía / rango
      </Typography>
      {PERSONNEL_RANK_ORDER.map((rank) => (
        <Stack key={rank.key} direction="row" spacing={1} alignItems="center">
          <Box sx={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            display: 'grid', placeItems: 'center', bgcolor: alpha(rank.color, 0.12),
          }}>
            <RankIcon rank={rank} size={13} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: rank.color, lineHeight: 1.25 }}>{rank.label}</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.25 }}>{rank.description}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  )
}
