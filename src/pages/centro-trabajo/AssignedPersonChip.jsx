import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useDndAssign } from '../../state/dndAssign'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Persona ya asignada a una area — arrastrable (para mover a otra
   area, o soltar sobre "Personal disponible" para quitarla) y con
   boton "x" para quitarla con un click (confirmacion ligera vive en
   DndAssignProvider, un solo lugar para toda la app). No duplica
   logica: ambos caminos llaman a requestRelease/releaseAssignment.
   ───────────────────────────────────────────── */
export default function AssignedPersonChip({ employeeId, name, size = 32 }) {
  const dnd = useDndAssign()
  return (
    <DraggablePersonChip employeeId={employeeId} sx={{ width: '100%' }}>
      <Stack
        direction="row" spacing={1} alignItems="center"
        sx={{ p: 1, pr: 0.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
      >
        <EmployeeAvatar employee={{ name }} size={size} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>{name}</Typography>
        </Box>
        <IconButton size="small" onClick={() => dnd.requestRelease(employeeId)} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>
    </DraggablePersonChip>
  )
}
