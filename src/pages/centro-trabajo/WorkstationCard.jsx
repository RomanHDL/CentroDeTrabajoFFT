import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { alpha, useTheme } from '@mui/material/styles'
import EmployeeAvatar from './EmployeeAvatar'

/**
 * Una estacion de la linea: ocupada (avatar, numero, nombre) o
 * disponible (borde punteado, "Disponible", rol requerido).
 * Se dibuja dentro de un grid responsive (repeat(auto-fit, ...))
 * en vez de una fila horizontal con scroll — asi caben todas las
 * estaciones de una linea grande (p.ej. Accesorios, 16) sin cortar
 * nada ni depender de scroll lateral.
 */
export default function WorkstationCard({ workstation, selected, onSelect, onEmployeeClick }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable

  return (
    <Paper
      elevation={0}
      onClick={() => onSelect(workstation)}
      sx={{
        p: 1.25, borderRadius: 2.5, textAlign: 'center', cursor: 'pointer', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        border: '1.5px solid',
        borderStyle: available ? 'dashed' : 'solid',
        borderColor: selected ? '#3B82F6' : available ? (d ? 'rgba(245,158,11,.4)' : '#F59E0B') : 'divider',
        bgcolor: available ? alpha('#F59E0B', d ? 0.06 : 0.05) : 'background.paper',
        transition: 'all .15s ease',
        '&:hover': { borderColor: '#3B82F6' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75, alignSelf: 'flex-start' }}>
        <Chip
          size="small"
          label={workstation.order}
          sx={{ height: 18, minWidth: 18, fontWeight: 800, fontSize: 10, bgcolor: 'action.selected' }}
        />
        <Typography sx={{ fontWeight: 800, fontSize: 12.5, lineHeight: 1.2, textAlign: 'left' }}>{workstation.name}</Typography>
      </Box>

      <Box
        onClick={(e) => { if (occupant) { e.stopPropagation(); onEmployeeClick(occupant.employee) } }}
        sx={{ my: 0.5 }}
      >
        <EmployeeAvatar employee={occupant?.employee} size={40} dashed={!occupant} />
      </Box>

      {occupant ? (
        <>
          <Typography sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2 }} noWrap>
            {occupant.employee?.name || '—'}
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{occupant.stationId ? occupant.checkInAt : ''}</Typography>
        </>
      ) : (
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3 }} noWrap>
          {workstation.requiredRole}
        </Typography>
      )}

      <Typography sx={{
        fontSize: 10.5, fontWeight: 800, mt: 0.5,
        color: available ? '#B45309' : workstation.isFull ? '#047857' : 'text.secondary',
      }}>
        {available ? 'DISPONIBLE' : `${workstation.occupants.length} / ${workstation.capacity}`}
      </Typography>
    </Paper>
  )
}
