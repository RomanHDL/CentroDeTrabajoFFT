import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { alpha } from '@mui/material/styles'
import { getAvailablePersonnelToday } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useDndAssign } from '../../state/dndAssign'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { EmptyState } from '../../ui'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Banda de personal disponible para asignar — fuente principal del
   drag & drop. Reutilizada en el layout general (Areas de trabajo)
   y dentro del detalle de cada area/linea (LineDetailDrawer).

   Si se recibe `scopedAreaId`, cada tarjeta tambien admite click
   directo ("Asignar" sin arrastrar) como alternativa real para
   tablet/touch y accesibilidad (el drag HTML5 no es confiable en
   touch) — nunca depende solo del drag.

   Scroll horizontal LOCAL de esta lista unicamente; la pagina nunca
   scrollea horizontal por esto.
   ───────────────────────────────────────────── */
export default function AvailablePersonnelTray({ scopedAreaId, title = 'Personal disponible para asignar' }) {
  const version = usePersonnelVersion()
  const dnd = useDndAssign()
  const people = getAvailablePersonnelToday()

  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
        {title} ({people.length})
      </Typography>
      {people.length === 0 ? (
        <EmptyState compact title="Nadie disponible" description="Todo el personal del directorio ya tiene ubicación asignada hoy." />
      ) : (
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 6 } }}>
          {people.map((p) => (
            <DraggablePersonChip key={p.id} employeeId={p.id} sx={{ flexShrink: 0 }}>
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                onClick={() => scopedAreaId && dnd.requestAssign(p.id, scopedAreaId)}
                sx={{
                  p: 0.75, pl: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  bgcolor: 'background.paper', minWidth: 0, cursor: scopedAreaId ? 'pointer' : 'grab',
                  '&:hover': scopedAreaId ? { borderColor: '#3B82F6', bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.1 : 0.05) } : {},
                }}
              >
                <EmployeeAvatar employee={p} size={26} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.name}</Typography>
                <DragIndicatorIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              </Stack>
            </DraggablePersonChip>
          ))}
        </Box>
      )}
    </Box>
  )
}
