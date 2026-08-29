import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ShieldIcon from '@mui/icons-material/Shield'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import SettingsIcon from '@mui/icons-material/Settings'
import BuildIcon from '@mui/icons-material/Build'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import PersonIcon from '@mui/icons-material/Person'
import { LINE_VISUAL_TYPE_ORDER } from '../../data/personnel/lineVisualType'

/* Rediseño WC LINEA 0-10 (2026-08-28, a peticion explicita del usuario)
   -- SOLO lo usa LineDetailDrawer.jsx. Dos leyendas separadas a
   proposito (Seccion 2 del pedido: "no confundir estado de estación con
   tipo de personal"): TIPO DE PERSONAL (icono+color por rol real) y
   ESTADO DE ESTACIÓN (icono+color por ocupacion). Nunca comparte
   iconos/colores con HierarchyLegend.jsx (ese es el sistema de
   Paletizado/Accesorios/Insumos/Midea/Conveyor, identidad visual
   distinta a proposito). */
export const LINE_TYPE_ICONS = {
  liderazgo: WorkspacePremiumIcon,
  calidad: ShieldIcon,
  produccion: SettingsIcon,
  tecnico: BuildIcon,
  suministro: Inventory2Icon,
  apoyo: PersonIcon,
}

export function LineTypeIcon({ type, size = 14, sx }) {
  const Icon = (type && LINE_TYPE_ICONS[type.iconKey]) || ShieldIcon
  return <Icon sx={{ fontSize: size, color: type?.color || 'text.disabled', ...sx }} />
}

const STATION_STATES = [
  { label: 'Ocupada', color: '#10B981' },
  { label: 'Disponible', color: '#F59E0B' },
  { label: 'Vacante crítica', color: '#EF4444' },
  { label: 'Sin asignación', color: '#94A3B8' },
]

export default function LineVisualLegend() {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 4 }, alignItems: 'center' }}>
      <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" alignItems="center">
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Jerarquía / Tipo de puesto
        </Typography>
        {LINE_VISUAL_TYPE_ORDER.map((type) => (
          <Stack key={type.key} direction="row" spacing={0.5} alignItems="center">
            <LineTypeIcon type={type} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
              {type.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          Estado de estación
        </Typography>
        {STATION_STATES.map((s) => (
          <Stack key={s.label} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>
              {s.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}
