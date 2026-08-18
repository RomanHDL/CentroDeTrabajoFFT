import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { alpha, useTheme } from '@mui/material/styles'
import EmployeeAvatar from './EmployeeAvatar'

const CARD_WIDTH = 168

/**
 * Una estacion de la linea: ocupada (foto/avatar, numero,
 * nombre, entrada) o disponible (borde punteado, "Disponible",
 * rol requerido). Conectada a la siguiente con una flecha
 * simple — sin 3D, solo CSS/flex.
 */
export default function WorkstationCard({ workstation, selected, onSelect, onEmployeeClick, isLast }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable

  return (
    <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
      <Paper
        elevation={0}
        onClick={() => onSelect(workstation)}
        sx={{
          width: CARD_WIDTH, p: 1.5, borderRadius: 3, textAlign: 'center', cursor: 'pointer',
          border: '2px solid',
          borderStyle: available ? 'dashed' : 'solid',
          borderColor: selected ? '#3B82F6' : available ? (d ? 'rgba(245,158,11,.4)' : '#F59E0B') : 'divider',
          bgcolor: available ? alpha('#F59E0B', d ? 0.06 : 0.05) : 'background.paper',
          transition: 'all .15s ease',
          '&:hover': { borderColor: '#3B82F6', transform: 'translateY(-2px)' },
        }}
      >
        <Chip
          size="small"
          label={workstation.order}
          sx={{ height: 20, minWidth: 20, fontWeight: 800, fontSize: 11, bgcolor: 'action.selected', mb: 0.75 }}
        />
        <Typography sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>{workstation.name}</Typography>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, mt: 0.25, mb: 1,
          color: available ? '#B45309' : workstation.isFull ? '#047857' : 'text.secondary',
        }}>
          {workstation.occupants.length} / {workstation.capacity}
        </Typography>

        <Box
          onClick={(e) => { if (occupant) { e.stopPropagation(); onEmployeeClick(occupant.employee) } }}
          sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}
        >
          <EmployeeAvatar employee={occupant?.employee} size={56} dashed={!occupant} />
        </Box>

        {occupant ? (
          <>
            <Typography sx={{ fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{occupant.employeeNumber}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', lineHeight: 1.2 }}>
              {occupant.employee?.name || '—'}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5 }}>Entrada: {occupant.checkInAt}</Typography>
          </>
        ) : (
          <>
            <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: '#B45309' }}>DISPONIBLE</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.75 }}>Rol requerido:</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{workstation.requiredRole}</Typography>
          </>
        )}
      </Paper>

      {!isLast && (
        <ArrowForwardIcon sx={{ color: 'text.disabled', mx: 0.75, flexShrink: 0 }} />
      )}
    </Stack>
  )
}
