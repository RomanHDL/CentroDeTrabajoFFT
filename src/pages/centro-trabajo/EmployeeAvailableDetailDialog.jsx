import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import CloseIcon from '@mui/icons-material/Close'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { getActividadForEmployee } from '../../data/production/personnelByArea'
import EmployeeAvatar from './EmployeeAvatar'

function DetailRow({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      {typeof value === 'string'
        ? <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 0.25 }}>{value}</Typography>
        : <Box sx={{ mt: 0.4 }}>{value}</Box>}
    </Box>
  )
}

/* ─────────────────────────────────────────────
   Detalle rapido de una persona de "Personal disponible" (2026-08-28,
   a peticion explicita del usuario) -- tap/click en una tarjeta abre
   esto en vez de asignar directo; el drag & drop sigue siendo el
   camino rapido, sin cambios. Solo datos REALES ya disponibles en el
   sistema (nunca correo/telefono/puesto/antiguedad inventados): No.
   empleado (o "PROYECTO" si no tiene, nunca un numero ficticio),
   estado, area actual, turno, y la actividad real de BASE si existe
   (mismo codigo crudo que ya usa SupportAreaDetail, sin traducirlo).
   "Asignar" reutiliza el flujo existente (onAssign, provisto por quien
   renderiza esto) -- nunca una segunda logica de asignacion. ───────────────────────────────────────────── */
export default function EmployeeAvailableDetailDialog({ employee, open, onClose, onAssign }) {
  if (!employee) return null
  const numberLabel = formatEmployeeNumber(employee.employeeNumber)
  const actividad = getActividadForEmployee(employee.id)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
        Detalle del empleado
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <EmployeeAvatar employee={employee} size={52} />
          <Typography sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{employee.name}</Typography>
        </Stack>
        <Stack spacing={1.75}>
          <DetailRow label="No. empleado" value={numberLabel} />
          <DetailRow
            label="Estado"
            value={
              <Chip size="small" label="Disponible" sx={{ fontWeight: 700, bgcolor: '#10B98122', color: '#047857', border: '1px solid #10B98155' }} />
            }
          />
          <DetailRow label="Área actual" value="Sin área asignada" />
          <DetailRow label="Turno" value="Sin turno asignado hoy" />
          {actividad && <DetailRow label="Actividad registrada (BASE)" value={actividad} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancelar</Button>
        {onAssign && (
          <Button variant="contained" onClick={onAssign} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Asignar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
