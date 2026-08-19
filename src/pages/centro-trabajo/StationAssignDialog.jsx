import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import SearchIcon from '@mui/icons-material/Search'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { CURRENT_SHIFT, workCenterById } from '../../data/production/catalog'
import {
  searchEmployees, getSuggestedCandidates, getCurrentAssignment, isPresentToday,
  checkInEmployee, moveEmployee, hasSkill,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Asignar personal tocando directamente una estacion disponible
   (Distribucion de estaciones) — sin navegar a otra pantalla.

   Reutiliza integramente la MISMA fuente de datos y las MISMAS
   acciones que ya existian (repository.js: searchEmployees,
   getSuggestedCandidates, checkInEmployee, moveEmployee): esto es
   una UI nueva sobre la logica que ya funcionaba en
   RegisterPersonnelDialog, no una segunda fuente de verdad.

   Flujo: buscar (o elegir de la lista sugerida) -> seleccionar ->
   confirmar (o resolver conflicto si ya tiene ubicacion hoy) ->
   listo. checkInEmployee/moveEmployee llaman notify() internamente,
   asi que toda la UI que use usePersonnelVersion() (la propia
   Distribucion de estaciones, Personal asignado, contadores, etc.)
   se refresca sola, sin F5.
   ───────────────────────────────────────────── */
export default function StationAssignDialog({ open, onClose, areaId, station, onDone }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const [query, setQuery] = useState('')
  const [showAllSuggested, setShowAllSuggested] = useState(false)
  const [step, setStep] = useState('SEARCH') // SEARCH | CONFIRM | CONFLICT | SUCCESS
  const [selected, setSelected] = useState(null)
  const [conflictAssignment, setConflictAssignment] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setShowAllSuggested(false)
      setStep('SEARCH')
      setSelected(null)
      setConflictAssignment(null)
      setError('')
      setResult(null)
    }
  }, [open, station])

  const areaName = workCenterById(areaId)?.name || areaId

  const suggested = useMemo(() => {
    if (!open || !station || query.trim()) return []
    return getSuggestedCandidates(areaId, station.name, { includeAbsent: showAllSuggested })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, areaId, station, query, showAllSuggested, version])

  const searchResults = useMemo(() => {
    if (!open || !station || !query.trim()) return []
    return searchEmployees(query).map((e) => ({
      employee: e,
      compatible: hasSkill(e.id, station.name),
      assignment: getCurrentAssignment(e.id),
      present: isPresentToday(e.id),
    })).sort((a, b) => (Number(b.compatible) - Number(a.compatible)) || a.employee.name.localeCompare(b.employee.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, station, version])

  if (!station) return null

  function pick(employee, assignment) {
    setSelected(employee)
    setError('')
    if (assignment) {
      setConflictAssignment(assignment)
      setStep('CONFLICT')
    } else {
      setStep('CONFIRM')
    }
  }

  function handleAssign() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    const res = checkInEmployee({
      employeeId: selected.id,
      employeeNumber: selected.employeeNumber,
      areaId,
      stationId: station.name,
      shift: CURRENT_SHIFT,
    })
    if (res.status === 'OK') {
      setResult({ employee: res.employee })
      setStep('SUCCESS')
      onDone && onDone()
    } else if (res.status === 'CONFLICT') {
      setConflictAssignment(res.assignment)
      setStep('CONFLICT')
    } else {
      setError(res.message || 'No se pudo asignar. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  function handleMove() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    const res = moveEmployee({
      employeeId: selected.id,
      toAreaId: areaId,
      toStationId: station.name,
      shift: CURRENT_SHIFT,
    })
    if (res.status === 'OK') {
      setResult({ employee: selected })
      setStep('SUCCESS')
      onDone && onDone()
    } else {
      setError(res.message || 'No se pudo mover al empleado. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      {step === 'SEARCH' && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Asignar personal — {station.name}</DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip size="small" label={`Estación: ${station.name}`} sx={ps.metricChip('default')} />
              <Chip size="small" label={`Rol requerido: ${station.requiredRole}`} sx={ps.metricChip('info')} />
              <Chip size="small" label="Disponible" sx={{ bgcolor: '#F59E0B22', color: '#B45309', fontWeight: 700 }} />
            </Stack>

            <TextField
              fullWidth
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número de empleado o nombre..."
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ opacity: 0.5 }} /></InputAdornment>,
              }}
              sx={{
                mb: 2.5,
                '& .MuiInputBase-input': { fontSize: 17, py: 1.5 },
                '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
              }}
            />

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!query.trim() && (
              <>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', mb: 1, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Personal sugerido para {station.requiredRole}
                </Typography>
                {suggested.length === 0 ? (
                  <EmptyState compact title="Sin candidatos" description="Nadie presente hoy tiene esta habilidad registrada todavía." />
                ) : (
                  <Stack spacing={1}>
                    {suggested.map((c) => (
                      <ResultRow
                        key={c.employee.id}
                        employee={c.employee}
                        compatible
                        present={c.present}
                        assignment={c.assignment}
                        onSelect={() => pick(c.employee, c.assignment)}
                      />
                    ))}
                  </Stack>
                )}
                <Button size="small" onClick={() => setShowAllSuggested((v) => !v)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
                  {showAllSuggested ? 'Ocultar no registrados hoy' : 'Ver más opciones'}
                </Button>
              </>
            )}

            {query.trim() && (
              searchResults.length === 0 ? (
                <EmptyState compact title="No se encontró personal" description="No encontramos empleados que coincidan con esta búsqueda." />
              ) : (
                <Stack spacing={1}>
                  {searchResults.map((r) => (
                    <ResultRow
                      key={r.employee.id}
                      employee={r.employee}
                      compatible={r.compatible}
                      present={r.present}
                      assignment={r.assignment}
                      onSelect={() => pick(r.employee, r.assignment)}
                    />
                  ))}
                </Stack>
              )
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogActions>
        </>
      )}

      {step === 'CONFIRM' && selected && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Confirmar asignación</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Empleado seleccionado
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ my: 1.5 }}>
              <EmployeeAvatar employee={selected} size={44} />
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{selected.name}</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Empleado #{selected.employeeNumber}</Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75 }}>
              Asignación
            </Typography>
            <Typography sx={{ fontSize: 14 }}>Estación: <b>{station.name}</b></Typography>
            <Typography sx={{ fontSize: 14 }}>Rol requerido: <b>{station.requiredRole}</b></Typography>
            <Typography sx={{ fontSize: 14 }}>Área: <b>{areaName}</b></Typography>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setStep('SEARCH')}>Cancelar</Button>
            <Button variant="contained" disabled={submitting} onClick={handleAssign} sx={{ fontWeight: 700 }}>
              Asignar a {station.name}
            </Button>
          </DialogActions>
        </>
      )}

      {step === 'CONFLICT' && selected && conflictAssignment && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Este empleado ya está asignado</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{selected.name}</Typography>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>Empleado #{selected.employeeNumber}</Typography>
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Actualmente</Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {workCenterById(conflictAssignment.areaId)?.name || conflictAssignment.areaId} — {conflictAssignment.stationId}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Entrada: {conflictAssignment.checkInAt}</Typography>
            </Box>
            {conflictAssignment.areaId === areaId && conflictAssignment.stationId === station.name ? (
              <Alert severity="info" sx={{ mt: 2 }}>Ya está asignado exactamente a esta estación.</Alert>
            ) : (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 2 }}>
                Nueva ubicación: <b>{areaName}</b> — {station.name}
              </Typography>
            )}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={() => setStep('SEARCH')}>Cancelar</Button>
            <Button
              variant="contained"
              disabled={submitting || (conflictAssignment.areaId === areaId && conflictAssignment.stationId === station.name)}
              onClick={handleMove}
              sx={{ fontWeight: 700 }}
            >
              Mover a esta estación
            </Button>
          </DialogActions>
        </>
      )}

      {step === 'SUCCESS' && result && (
        <DialogContent sx={{ pt: 4, pb: 3, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 1 }}>Asignado correctamente</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{result.employee.name}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2.5 }}>
            #{result.employee.employeeNumber} · {station.name}
          </Typography>
          <Button variant="contained" onClick={onClose} sx={{ fontWeight: 700 }}>Cerrar</Button>
        </DialogContent>
      )}
    </Dialog>
  )
}

function ResultRow({ employee, compatible, present, assignment, onSelect }) {
  const statusLabel = assignment
    ? `Asignado — ${assignment.stationId}`
    : present ? 'Disponible hoy' : 'No registrado hoy'
  const statusColor = assignment ? '#B45309' : present ? '#047857' : 'text.secondary'
  return (
    <Stack
      direction="row" spacing={1.5} alignItems="center"
      sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
    >
      <EmployeeAvatar employee={employee} size={44} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>{employee.name}</Typography>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
          Empleado #{employee.employeeNumber}{compatible ? ' · Habilidad registrada' : ''}
        </Typography>
        <Typography sx={{ fontSize: 11, color: statusColor, fontWeight: 700 }}>{statusLabel}</Typography>
      </Box>
      <Button
        size="medium"
        variant="outlined"
        onClick={onSelect}
        sx={{ textTransform: 'none', fontWeight: 700, minHeight: 40, minWidth: 96, flexShrink: 0 }}
      >
        Seleccionar
      </Button>
    </Stack>
  )
}
