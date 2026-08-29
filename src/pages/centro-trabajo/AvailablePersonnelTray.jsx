import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { alpha } from '@mui/material/styles'
import { getAvailablePersonnelToday } from '../../data/production/personnelByArea'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useDndAssign } from '../../state/dndAssign'
import { useEmployeeDropTargetRelease } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { EmptyState } from '../../ui'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeAvailableDetailDialog from './EmployeeAvailableDetailDialog'

/* ─────────────────────────────────────────────
   Banda de personal disponible para asignar — fuente principal del
   drag & drop. Reutilizada en el layout general (Areas de trabajo)
   y dentro del detalle de cada area/linea (LineDetailDrawer).

   Si se recibe `scopedAreaId`, cada tarjeta tambien admite click/tap
   ("Asignar" sin arrastrar) como alternativa real para tablet/touch y
   accesibilidad (el drag HTML5 no es confiable en touch) — nunca
   depende solo del drag. 2026-08-28 (a peticion explicita del
   usuario): ese click ahora abre primero un detalle rapido de la
   persona (EmployeeAvailableDetailDialog) en vez de asignar directo;
   desde ahi "Asignar" dispara EXACTAMENTE el mismo dnd.requestAssign
   de siempre. El drag sigue siendo instantaneo, sin pasar por el
   detalle.

   Buscador (mismo pedido): filtra `people` -- la MISMA lista que ya
   trae getAvailablePersonnelToday(), nunca una segunda consulta -- por
   nombre o numero de empleado, sin distinguir mayusculas/minusculas.
   El total del encabezado SIEMPRE es people.length (nunca el conteo
   filtrado) — mientras se busca se agrega aparte cuantos resultados
   hay, sin recalcular el total real.

   Scroll horizontal LOCAL de esta lista unicamente; la pagina nunca
   scrollea horizontal por esto.
   ───────────────────────────────────────────── */
export default function AvailablePersonnelTray({
  scopedAreaId,
  title = 'Personal disponible para asignar',
  hideTitle = false,
}) {
  const version = usePersonnelVersion()
  const dnd = useDndAssign()
  const people = getAvailablePersonnelToday()
  const { isOver, dropProps } = useEmployeeDropTargetRelease()
  const [query, setQuery] = useState('')
  const [detailPerson, setDetailPerson] = useState(null)

  const q = query.trim().toLowerCase()
  const filtered = q
    ? people.filter((p) => {
        const numberLabel = formatEmployeeNumber(p.employeeNumber)
        return (
          (p.name || '').toLowerCase().includes(q) ||
          String(p.employeeNumber || '')
            .toLowerCase()
            .includes(q) ||
          numberLabel.toLowerCase().includes(q)
        )
      })
    : people

  return (
    <Box
      {...dropProps}
      sx={{
        p: 1,
        borderRadius: 2,
        border: '1.5px dashed',
        borderColor: isOver ? '#3B82F6' : 'transparent',
        bgcolor: (t) =>
          isOver ? alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08) : 'transparent',
        transition: 'all .15s ease',
      }}
    >
      {!hideTitle && (
        <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mb: 1 }} flexWrap="wrap">
          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 800,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {title} ({people.length})
          </Typography>
          {q && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              · {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
            </Typography>
          )}
        </Stack>
      )}
      {isOver && (
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#3B82F6', mb: 1 }}>
          Soltar aquí para quitar la asignación
        </Typography>
      )}

      {people.length > 0 && (
        <TextField
          fullWidth
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o número de empleado..."
          sx={{
            mb: 1.25,
            '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, opacity: 0.5 }} />
              </InputAdornment>
            ),
            endAdornment: query && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setQuery('')}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      )}

      {people.length === 0 ? (
        <EmptyState
          compact
          title="No hay personal disponible sin asignación."
          description="Todo el personal activo ya tiene ubicación asignada hoy."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          title="No se encontraron empleados"
          description="Prueba con otro nombre o número."
        />
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 6 },
          }}
        >
          {filtered.map((p) => (
            <DraggablePersonChip key={p.id} employeeId={p.id} sx={{ flexShrink: 0 }}>
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                onClick={() => setDetailPerson(p)}
                sx={{
                  p: 0.75,
                  pl: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  minWidth: 0,
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: '#3B82F6',
                    bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.1 : 0.05),
                  },
                }}
              >
                <EmployeeAvatar employee={p} size={30} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {p.name}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {formatEmployeeNumber(p.employeeNumber)}
                  </Typography>
                </Box>
                <DragIndicatorIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
              </Stack>
            </DraggablePersonChip>
          ))}
        </Box>
      )}

      <EmployeeAvailableDetailDialog
        employee={detailPerson}
        open={Boolean(detailPerson)}
        onClose={() => setDetailPerson(null)}
        onAssign={
          scopedAreaId
            ? () => {
                const person = detailPerson
                setDetailPerson(null)
                dnd.requestAssign(person.id, scopedAreaId)
              }
            : undefined
        }
      />
    </Box>
  )
}
