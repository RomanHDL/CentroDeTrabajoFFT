import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import PersonOffIcon from '@mui/icons-material/PersonOffOutlined'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import { alpha, useTheme } from '@mui/material/styles'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'
import { getPersonnelVisualType } from '../../data/personnel/lineVisualType'
import { getActividadForEmployee } from '../../data/production/personnelByArea'
import { LineTypeIcon } from './LineVisualLegend'

/* ─────────────────────────────────────────────
   Tarjeta de estacion NUEVA, exclusiva de WC LINEA 0-10 (2026-08-28,
   "REDISEÑO DE WC LINEA 0 A WC LINEA 10", a peticion explicita del
   usuario: "identidad visual propia, NO copiar el diseño de
   Paletizado"). Separada a proposito de LineStationCard.jsx -- ese sigue
   intacto, usado exclusivamente por LineLikeAreaDetail.jsx (Paletizado/
   Accesorios/Insumos/Midea/Conveyor). Mismo hook de drop
   (useEmployeeDropTargetStation) y mismo origen de drag
   (DraggablePersonChip) que ya usa toda la app -- el drag&drop NO se
   reinventa, solo la presentacion visual.

   Dos sistemas de color SEPARADOS (Seccion 2 del pedido): el borde/fondo
   de la card indica ESTADO de la estacion (ambar disponible / verde
   ocupada / azul seleccionada, igual logica que ya tenia
   LineStationCard.jsx); el badge bajo el nombre indica TIPO DE PERSONAL
   (lineVisualType.js) -- nunca el mismo color para ambas cosas. */
export default function LineWorkstationCard({ workAreaId, workstation, selected, onSelect, onEmployeeClick }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable

  const actividad = occupant?.employee?.id ? getActividadForEmployee(occupant.employee.id) : null
  const visualType = occupant ? getPersonnelVisualType({ stationRole: workstation.role, actividad }) : null

  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const accent = isOver ? '#3B82F6' : selected ? '#3B82F6' : occupant ? '#10B981' : '#F59E0B'

  return (
    <Paper
      elevation={0}
      {...dropProps}
      onClick={() => onSelect(workstation)}
      sx={{
        position: 'relative', p: 1.5, borderRadius: 3, cursor: 'pointer',
        minHeight: 190, height: '100%',
        display: 'flex', flexDirection: 'column', gap: 0.75,
        border: '1.5px solid',
        borderStyle: available && !occupant ? 'dashed' : 'solid',
        borderColor: isOver || selected ? '#3B82F6' : occupant ? alpha('#10B981', d ? 0.4 : 0.35) : alpha('#F59E0B', d ? 0.4 : 0.35),
        bgcolor: isOver
          ? alpha('#3B82F6', d ? 0.18 : 0.08)
          : occupant
            ? (d ? alpha('#10B981', 0.06) : '#F7FEFB')
            : (d ? alpha('#F59E0B', 0.05) : '#FFFCF5'),
        transition: 'all .15s ease',
        '&:hover': { borderColor: '#3B82F6', boxShadow: d ? '0 4px 16px rgba(0,0,0,.35)' : '0 4px 16px rgba(0,0,0,.08)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        <Box sx={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 800,
          bgcolor: alpha(accent, d ? 0.22 : 0.14), color: accent,
        }}>
          {workstation.order}
        </Box>
        <Tooltip title={workstation.name}>
          <Typography
            sx={{
              fontWeight: 800, fontSize: 11.5, lineHeight: 1.2,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word',
            }}
          >
            {workstation.name}
          </Typography>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 0.5, minWidth: 0, width: '100%' }}>
        {occupant ? (
          <DraggablePersonChip employeeId={occupant.employee?.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
            <Box
              onClick={(e) => { e.stopPropagation(); onEmployeeClick(occupant.employee) }}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}
            >
              <Box sx={{ position: 'relative' }}>
                <EmployeeAvatar employee={occupant.employee} size={40} />
                {visualType?.key === 'LINE_LEADER' && (
                  <Box sx={{
                    position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
                    display: 'grid', placeItems: 'center', bgcolor: visualType.color,
                    border: '2px solid', borderColor: d ? '#0F172A' : '#FFFFFF',
                  }}>
                    <WorkspacePremiumIcon sx={{ fontSize: 11, color: '#FFFFFF' }} />
                  </Box>
                )}
              </Box>
              <Tooltip title={occupant.employee?.name || ''}>
                <Typography sx={{
                  fontWeight: 700, fontSize: 12, lineHeight: 1.2, textAlign: 'center', width: '100%',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word',
                }}>
                  {occupant.employee?.name || '—'}
                </Typography>
              </Tooltip>
              {visualType && (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.4,
                  px: 0.75, py: 0.15, borderRadius: 5,
                  bgcolor: alpha(visualType.color, d ? 0.22 : 0.12),
                }}>
                  <LineTypeIcon type={visualType} size={10} />
                  <Typography sx={{
                    fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: visualType.color,
                  }} noWrap>
                    {visualType.label}
                  </Typography>
                </Box>
              )}
            </Box>
          </DraggablePersonChip>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <PersonOffIcon sx={{ fontSize: 26, color: alpha('#F59E0B', d ? 0.7 : 0.55) }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3, textAlign: 'center' }} noWrap>
              {workstation.requiredRole}
            </Typography>
          </Box>
        )}
      </Box>

      <Typography sx={{
        fontSize: 10, fontWeight: 800, textAlign: 'center', letterSpacing: 0.3,
        color: occupant ? '#059669' : '#B45309',
      }}>
        {occupant ? 'OCUPADA' : 'DISPONIBLE'}
      </Typography>
    </Paper>
  )
}
