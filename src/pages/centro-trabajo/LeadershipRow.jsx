import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { alpha, useTheme } from '@mui/material/styles'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'
import { RankIcon } from './HierarchyLegend'

/* ─────────────────────────────────────────────
   Fila ancha de liderazgo (2026-08-28, "REFINAMIENTO VISUAL Grupo C",
   a peticion explicita del usuario -- Seccion 7: "el líder NO debe verse
   como una estación normal... card horizontal más importante pero
   compacta"). SOLO la usa LineLikeAreaDetail.jsx para el/los puesto(s)
   cuyo rango es de tipo liderazgo (hoy: Team Leader) -- el resto de
   puestos sigue usando LineStationCard.jsx en grid, sin cambios.

   `rank` es siempre un objeto de rankSystem.js (PERSONNEL_RANKS,
   getPersonnelRank) -- mismo sistema que ya usa LineStationCard.jsx/
   HierarchyLegend.jsx en este archivo, nunca lineVisualType.js (ese es
   exclusivo de WC LINEA, sistema visual deliberadamente separado). */
export default function LeadershipRow({
  workAreaId,
  workstation,
  selected,
  onSelect,
  onEmployeeClick,
  rank,
}) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable
  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const accent = isOver ? '#3B82F6' : selected ? '#3B82F6' : occupant ? '#10B981' : '#F59E0B'

  return (
    <Paper
      elevation={0}
      {...dropProps}
      onClick={() => onSelect(workstation)}
      sx={{
        p: 1.5,
        borderRadius: 3,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        border: '1.5px solid',
        borderStyle: available && !occupant ? 'dashed' : 'solid',
        borderColor:
          isOver || selected
            ? '#3B82F6'
            : occupant
              ? alpha('#10B981', d ? 0.4 : 0.35)
              : alpha('#F59E0B', d ? 0.4 : 0.35),
        bgcolor: isOver
          ? alpha('#3B82F6', d ? 0.18 : 0.08)
          : occupant
            ? d
              ? alpha('#10B981', 0.06)
              : '#F7FEFB'
            : d
              ? alpha('#F59E0B', 0.05)
              : '#FFFCF5',
        transition: 'all .15s ease',
        '&:hover': {
          borderColor: '#3B82F6',
          boxShadow: d ? '0 4px 16px rgba(0,0,0,.35)' : '0 4px 16px rgba(0,0,0,.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: 11,
          fontWeight: 800,
          bgcolor: alpha(accent, d ? 0.22 : 0.14),
          color: accent,
        }}
      >
        {workstation.order}
      </Box>

      {occupant ? (
        <DraggablePersonChip employeeId={occupant.employee?.id} sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            onClick={(e) => {
              e.stopPropagation()
              onEmployeeClick(occupant.employee)
            }}
          >
            <EmployeeAvatar employee={occupant.employee} size={42} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15 }} noWrap>
                {occupant.employee?.name}
              </Typography>
              {rank && (
                <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.25 }}>
                  <RankIcon rank={rank} size={12} />
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      color: rank.color,
                      textTransform: 'uppercase',
                    }}
                  >
                    {rank.label}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Stack>
        </DraggablePersonChip>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: 'text.secondary' }}>
            Sin asignar
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }} noWrap>
            {workstation.requiredRole}
          </Typography>
        </Box>
      )}

      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 0.3,
          flexShrink: 0,
          color: occupant ? '#059669' : '#B45309',
        }}
      >
        {occupant ? 'OCUPADO' : 'DISPONIBLE'}
      </Typography>
    </Paper>
  )
}
