import Box from '@mui/material/Box'
import { useEmployeeDragSource } from './dnd'

/* Envoltura generica: hace arrastrable cualquier renderizado de una
   persona (tag, fila, tarjeta) sin duplicar su estilo visual. Usada
   en WorkAreaMap, AreaDetailPanel, LineDetailDrawer y la banda de
   "Personal disponible". */
export default function DraggablePersonChip({ employeeId, children, sx }) {
  const { dragging, dragProps } = useEmployeeDragSource(employeeId)
  return (
    <Box
      {...dragProps}
      sx={{
        cursor: 'grab', opacity: dragging ? 0.4 : 1, transition: 'opacity .15s ease',
        '&:active': { cursor: 'grabbing' },
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}
