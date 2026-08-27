import React from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import PersonOffIcon from '@mui/icons-material/PersonOffOutlined'
import { alpha, useTheme } from '@mui/material/styles'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'
import { getPersonnelRank } from '../../data/personnel/rankSystem'

/* ─────────────────────────────────────────────
   Tarjeta de estacion para el rediseño de CT LINEA (2026-08-26, a
   peticion explicita del usuario -- mockup "CT LINEA 6"). Componente
   NUEVO, separado de WorkstationCard.jsx (ese sigue usandolo
   WorkAreaMap.jsx, se deja intacto). Misma logica de drop/seleccion
   que WorkstationCard, solo mas rica visualmente: numero de posicion
   en circulo, nombre de estacion (ya unico -- "Etiquetado"/
   "Etiquetado 2", ver workstations.js) siempre visible arriba,
   acento de color por estado.

   SIN accion rapida de "quitar" en la tarjeta a proposito (se probo y
   se quito, 2026-08-26): el icono quedaba demasiado cerca del titulo
   dentro de una tarjeta angosta y un click normal para SELECCIONAR la
   estacion podia liberar a alguien por accidente -- inaceptable en una
   herramienta de produccion real. Quitar/mover sigue disponible por la
   tabla ("Quitar") y por el panel lateral (click en el ocupante). */
export default function LineStationCard({ workAreaId, workstation, selected, onSelect, onEmployeeClick, lineLike = false }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable
  // Rango visual por área+puesto+rango (2026-08-27, a peticion explicita del usuario) -- por
  // defecto SOLO en areas LINE_LIKE (Familia C: Paletizado/Accesorios/Insumos/Midea/Conveyor
  // General). EXCEPCION explicita (misma fecha, segunda ronda del pedido): el puesto "Calidad"
  // (agregado como puesto real adicional en cada CT LINEA 0..10, ver workstations.js) SI
  // muestra el badge de rango aunque lineLike sea false -- es el UNICO rol de una WC LINEA real
  // que lo hace, ningun otro puesto de linea (Montaje/Prueba eléctrica/...) se ve afectado, el
  // diseño de esas tarjetas sigue exactamente igual que antes. Se deriva del `role` REAL de la
  // estacion (nunca del nombre del empleado, ver rankSystem.js) -- null cuando el puesto no
  // tiene informacion suficiente, nunca se inventa un rango.
  const showRank = lineLike || workstation.role === 'Calidad'
  const rank = showRank && occupant ? getPersonnelRank(workstation.role) : null
  // 2026-08-26: antes se deshabilitaba el drop si la estacion ya estaba
  // ocupada -- ahora SIEMPRE es zona de suelta (peticion explicita del
  // usuario: arrastrar a alguien al puesto de otra persona debe
  // intercambiarlos, no quedar bloqueado). requestAssignToStation
  // (dndAssign.jsx) detecta la ocupacion y decide swap vs asignacion.
  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const accent = isOver ? '#3B82F6' : selected ? '#3B82F6' : occupant ? '#10B981' : '#F59E0B'

  return (
    <Paper
      elevation={0}
      {...dropProps}
      onClick={() => onSelect(workstation)}
      sx={{
        position: 'relative', p: 1.5, borderRadius: 3, cursor: 'pointer', height: '100%',
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
        <Typography sx={{ fontWeight: 800, fontSize: 12.5, lineHeight: 1.2 }} noWrap>{workstation.name}</Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 0.5 }}>
        {occupant ? (
          // 2026-08-27, a peticion explicita del usuario ("quiero arrastrarlos
          // entre ahí y que se cambien"): antes solo la fila de la tabla de
          // abajo era arrastrable -- el ocupante mostrado AQUÍ, en la propia
          // tarjeta del puesto, era un simple onClick. Ahora tambien es
          // origen de drag (DraggablePersonChip, mismo hook que ya usa toda
          // la app), para poder arrastrar directo de un puesto a otro dentro
          // de la cuadrícula y disparar el intercambio real (dndAssign.jsx).
          <DraggablePersonChip employeeId={occupant.employee?.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box
              onClick={(e) => { e.stopPropagation(); onEmployeeClick(occupant.employee) }}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
            >
              <Box sx={{ position: 'relative' }}>
                <EmployeeAvatar employee={occupant.employee} size={40} />
                {rank && (
                  <Box sx={{
                    position: 'absolute', inset: -2, borderRadius: '50%',
                    border: '2px solid', borderColor: rank.color, pointerEvents: 'none',
                  }} />
                )}
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2, textAlign: 'center' }} noWrap>
                {occupant.employee?.name || '—'}
              </Typography>
              {rank && (
                <Typography sx={{
                  fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3,
                  px: 0.75, py: 0.15, borderRadius: 5,
                  bgcolor: alpha(rank.color, d ? 0.22 : 0.12), color: rank.color,
                }} noWrap>
                  {rank.label}
                </Typography>
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
