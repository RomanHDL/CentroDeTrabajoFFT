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
   por ADMINISTRADOR"; agrandada 2026-08-27, "AJUSTE VISUAL MUY ESPECIFICO
   -- cards mas grandes/legibles", a peticion explicita del usuario). Separada
   a proposito de LineStationCard.jsx -- ese sigue intacto, usado
   exclusivamente por LineLikeAreaDetail.jsx.

   Layout VERTICAL centrado (seccion 3 del pedido de agrandado): encabezado
   (orden + nombre de estacion + menu admin), fila de categoria, bloque
   central con avatar + nombre de empleado (hasta 2 lineas reservadas SIEMPRE,
   para que todas las cards midan lo mismo sin importar el largo del nombre --
   seccion 10: "todas las cards de una misma distribucion deben mantener una
   altura visual consistente"), rol requerido (hasta 2 lineas), estado. La
   categoria (LIDERAZGO/CALIDAD/PRODUCCION/TECNICO/SUMINISTRO/APOYO) sigue
   siendo una propiedad de la ESTACION, no del ocupante -- se calcula siempre
   (con o sin ocupante). Estado (ocupada/disponible) sigue siendo un sistema
   de color SEPARADO (borde/fondo de la card). */
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
        position: 'relative', p: 1.75, borderRadius: 3, cursor: 'pointer',
        height: 192, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', gap: 0.6,
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
            sx={{ position: 'absolute', top: 6, right: 6, p: 0.4 }}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={(e) => { e?.stopPropagation?.(); setMenuAnchor(null) }} onClick={(e) => e.stopPropagation()}>
            <MenuItem onClick={() => { setMenuAnchor(null); onEdit?.(workstation) }}>Editar puesto</MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); onDeactivate?.(workstation) }} disabled={!!occupant}>
              Eliminar puesto
            </MenuItem>
          </Menu>
        </>
      )}

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, minWidth: 0, pr: isAdmin ? 3 : 0 }}>
        <Box sx={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0, mt: 0.1,
          display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800,
          bgcolor: alpha(accent, d ? 0.22 : 0.14), color: accent,
        }}>
          {workstation.order}
        </Box>
        <Tooltip title={workstation.name}>
          <Typography sx={{
            fontWeight: 800, fontSize: 13, lineHeight: 1.25, flex: 1, minWidth: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word',
          }}>
            {workstation.name}
          </Typography>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minHeight: 16 }}>
        {visualType && (
          <>
            <LineTypeIcon type={visualType} size={12} />
            <Typography sx={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: visualType.color }} noWrap>
              {visualType.label}
            </Typography>
          </>
        )}
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5, minWidth: 0, width: '100%' }}>
        {occupant ? (
          <DraggablePersonChip employeeId={occupant.employee?.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}>
            <Box
              onClick={(e) => { e.stopPropagation(); onEmployeeClick(occupant.employee) }}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, width: '100%' }}
            >
              <EmployeeAvatar employee={occupant.employee} size={40} />
              <Tooltip title={occupant.employee?.name || ''}>
                <Typography sx={{
                  fontWeight: 700, fontSize: 12.5, lineHeight: 1.2, textAlign: 'center', width: '100%',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word',
                  minHeight: '2.4em',
                }}>
                  {occupant.employee?.name || '—'}
                </Typography>
              </Tooltip>
            </Box>
          </DraggablePersonChip>
        ) : (
          <>
            <PersonOffIcon sx={{ fontSize: 30, color: alpha('#F59E0B', d ? 0.7 : 0.55) }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', textAlign: 'center', minHeight: '2.4em' }}>
              Sin asignar
            </Typography>
          </>
        )}
        <Typography sx={{
          fontSize: 10.5, color: 'text.secondary', textAlign: 'center', lineHeight: 1.25, width: '100%',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word',
          minHeight: '2.4em',
        }}>
          {workstation.requiredRole}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: occupant ? '#10B981' : '#F59E0B', flexShrink: 0 }} />
        <Typography sx={{
          fontSize: 11, fontWeight: 800, letterSpacing: 0.3,
          color: occupant ? '#059669' : '#B45309',
        }}>
          {occupant ? 'OCUPADA' : 'DISPONIBLE'}
        </Typography>
      </Box>
    </Paper>
  )
}
