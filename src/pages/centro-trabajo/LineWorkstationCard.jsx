import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import PersonOffIcon from '@mui/icons-material/PersonOffOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { alpha, useTheme } from '@mui/material/styles'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'
import { getPersonnelVisualType } from '../../data/personnel/lineVisualType'
import { getActividadForEmployee } from '../../data/production/personnelByArea'
import { LineTypeIcon } from './LineVisualLegend'

/* ─────────────────────────────────────────────
   Tarjeta de estacion, exclusiva de WC LINEA 0-10 (2026-08-28, "REDISEÑO DE
   WC LINEA 0 A WC LINEA 10"; ampliada 2026-08-27, "estaciones configurables
   por ADMINISTRADOR"). Separada a proposito de LineStationCard.jsx -- ese
   sigue intacto, usado exclusivamente por LineLikeAreaDetail.jsx.

   Layout HORIZONTAL compacto (2026-08-27, a peticion explicita del usuario:
   "no quiero cards grandes") -- avatar chico a la izquierda, texto a la
   derecha, sin bloque centrado que infla la altura. La categoria
   (LIDERAZGO/CALIDAD/PRODUCCION/TECNICO/SUMINISTRO/APOYO) es una propiedad
   de la ESTACION, no del ocupante -- se calcula siempre (con o sin
   ocupante) y se muestra explicitamente (seccion 5/12 del pedido: nombre +
   rol requerido + categoria, nunca solo color). Estado (ocupada/disponible)
   sigue siendo un sistema de color SEPARADO (borde/fondo de la card). */
export default function LineWorkstationCard({ workAreaId, workstation, selected, onSelect, onEmployeeClick, isAdmin, onEdit, onDeactivate }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable
  const [menuAnchor, setMenuAnchor] = useState(null)

  const actividad = occupant?.employee?.id ? getActividadForEmployee(occupant.employee.id) : null
  const visualType = getPersonnelVisualType({ stationRole: workstation.role, actividad, category: workstation.category })

  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const accent = isOver ? '#3B82F6' : selected ? '#3B82F6' : occupant ? '#10B981' : '#F59E0B'

  return (
    <Paper
      elevation={0}
      {...dropProps}
      onClick={() => onSelect(workstation)}
      sx={{
        position: 'relative', p: 1.1, borderRadius: 2.5, cursor: 'pointer',
        height: 118, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 0.5,
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
      {isAdmin && (
        <>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget) }}
            sx={{ position: 'absolute', top: 2, right: 2, p: 0.3 }}
          >
            <MoreVertIcon sx={{ fontSize: 15 }} />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={(e) => { e?.stopPropagation?.(); setMenuAnchor(null) }} onClick={(e) => e.stopPropagation()}>
            <MenuItem onClick={() => { setMenuAnchor(null); onEdit?.(workstation) }}>Editar puesto</MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); onDeactivate?.(workstation) }} disabled={!!occupant}>
              Eliminar puesto
            </MenuItem>
          </Menu>
        </>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, pr: isAdmin ? 2 : 0 }}>
        <Box sx={{
          width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
          display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 800,
          bgcolor: alpha(accent, d ? 0.22 : 0.14), color: accent,
        }}>
          {workstation.order}
        </Box>
        <Tooltip title={workstation.name}>
          <Typography sx={{ fontWeight: 800, fontSize: 11, lineHeight: 1.2, flex: 1, minWidth: 0 }} noWrap>
            {workstation.name}
          </Typography>
        </Tooltip>
      </Box>

      {visualType && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <LineTypeIcon type={visualType} size={10} />
          <Typography sx={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: visualType.color }} noWrap>
            {visualType.label}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
        {occupant ? (
          <DraggablePersonChip employeeId={occupant.employee?.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
            <Box onClick={(e) => { e.stopPropagation(); onEmployeeClick(occupant.employee) }} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
              <EmployeeAvatar employee={occupant.employee} size={26} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Tooltip title={occupant.employee?.name || ''}>
                  <Typography sx={{ fontWeight: 700, fontSize: 10.5, lineHeight: 1.2 }} noWrap>
                    {occupant.employee?.name || '—'}
                  </Typography>
                </Tooltip>
                <Typography sx={{ fontSize: 8.5, color: 'text.secondary', lineHeight: 1.2 }} noWrap>
                  {workstation.requiredRole}
                </Typography>
              </Box>
            </Box>
          </DraggablePersonChip>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
            <PersonOffIcon sx={{ fontSize: 18, color: alpha('#F59E0B', d ? 0.7 : 0.55), flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', lineHeight: 1.2 }}>Sin asignar</Typography>
              <Typography sx={{ fontSize: 8.5, color: 'text.disabled', lineHeight: 1.2 }} noWrap>{workstation.requiredRole}</Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Typography sx={{
        fontSize: 9, fontWeight: 800, letterSpacing: 0.3, alignSelf: 'flex-start',
        color: occupant ? '#059669' : '#B45309',
      }}>
        {occupant ? 'OCUPADA' : 'DISPONIBLE'}
      </Typography>
    </Paper>
  )
}
