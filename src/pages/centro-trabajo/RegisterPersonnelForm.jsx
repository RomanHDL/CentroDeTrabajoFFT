import React, { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import { usePageStyles } from '../../ui/pageStyles'
import { WORK_CENTERS, SHIFT_OPTIONS, CURRENT_SHIFT, workCenterById } from '../../data/production/catalog'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import { checkInEmployee, moveEmployee, requestMove, createEmployee, getStationOccupancy, hasSkill } from '../../data/personnel/repository'
import { useAuth } from '../../state/auth'
import EmployeeSearchField from './EmployeeSearchField'

const emptyForm = (fixedAreaId) => ({
  employee: null,
  employeeNumberTyped: '',
  name: '',
  noNumber: false,
  areaId: fixedAreaId || WORK_CENTERS[0].id,
  stationId: '',
  shift: CURRENT_SHIFT,
})

/**
 * Formulario de registro de personal (check-in diario), compartido
 * entre el dialogo de Centro de Trabajo (RegisterPersonnelDialog) y
 * la pagina propia "Registro de personal" — misma logica de negocio
 * en un solo lugar para que nunca se desincronicen.
 *
 * "No tiene numero de empleado": quien no tiene numero real se
 * registra como 'PROYECTO' (valor que MUCHAS personas comparten a
 * proposito, ver SHARED_PLACEHOLDER_NUMBERS en repository.js) y se
 * identifica por su nombre completo — por eso siempre crea un
 * empleado NUEVO (nunca busca por numero, que seria ambiguo) y hace
 * el check-in pasando employeeId directo.
 *
 * fixedAreaId: si se abre desde dentro de una linea, el area ya se
 * conoce y no se vuelve a pedir (menos toques en tablet).
 */
export default function RegisterPersonnelForm({ fixedAreaId = null, onCancel, onDone, cancelLabel = 'Cancelar' }) {
  const ps = usePageStyles()
  const { user } = useAuth()
  const isLider = user?.role === 'LIDER'
  const [form, setForm] = useState(() => emptyForm(fixedAreaId))
  const [step, setStep] = useState('FORM') // FORM | CONFLICT | SUCCESS | PENDING
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [result, setResult] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)

  useEffect(() => {
    setForm(emptyForm(fixedAreaId))
    setStep('FORM')
    setError('')
    setConflict(null)
    setResult(null)
    setPendingRequest(null)
  }, [fixedAreaId])

  const areaId = fixedAreaId || form.areaId
  const areaName = workCenterById(areaId)?.name || areaId
  const stations = useMemo(() => getWorkstationsForLine(areaId), [areaId])

  const employeeNumber = form.employee?.employeeNumber || form.employeeNumberTyped
  const needsName = !form.noNumber && employeeNumber.trim().length > 0 && !form.employee

  const canSubmit = form.noNumber
    ? form.name.trim() && form.stationId && areaId
    : employeeNumber.trim() && form.stationId && areaId && (!needsName || form.name.trim())

  const handleSearch = (selected, typedText) => {
    setForm(f => ({ ...f, employee: selected, employeeNumberTyped: selected ? selected.employeeNumber : (typedText || '') }))
  }

  const handleToggleNoNumber = (checked) => {
    setForm(f => ({ ...f, noNumber: checked, employee: null, employeeNumberTyped: '', name: checked ? f.name : '' }))
  }

  const applyCheckInResult = (res) => {
    if (res.status === 'OK') {
      setResult({ employee: res.employee, assignment: res.assignment, eventLabel: 'Entrada', eventTime: res.assignment.checkInAt })
      setStep('SUCCESS')
      onDone && onDone()
    } else if (res.status === 'CONFLICT') {
      // Mismo empleado, misma área y misma forma de trabajo (estación) que ya tenía hoy: no es
      // una reasignación, solo se cuenta su asistencia de hoy (ya registrada desde su primer
      // check-in) — sin diálogo de confirmación, a peticion explicita del usuario. Cualquier otro
      // caso (otra área, o misma área con otra estación/forma de trabajo) SI es un cambio real y
      // pasa al panel de confirmación (step CONFLICT) para que quede claro que va a moverse.
      const sameSpot = res.assignment.areaId === areaId && res.assignment.stationId === form.stationId
      if (sameSpot) {
        setResult({ employee: res.employee, assignment: res.assignment, eventLabel: 'Asistencia', eventTime: res.assignment.checkInAt, alreadyThere: true })
        setStep('SUCCESS')
        onDone && onDone()
      } else {
        setConflict(res)
        setStep('CONFLICT')
      }
    } else if (res.status === 'STATION_FULL') {
      setError(res.message)
    } else if (res.status === 'NEEDS_NAME') {
      setError('Este número de empleado no está registrado. Captura su nombre para darlo de alta.')
    } else {
      setError(res.message || 'No se pudo registrar. Intenta de nuevo.')
    }
  }

  const handleConfirm = () => {
    if (submitting || !canSubmit) return
    setSubmitting(true)
    setError('')

    if (form.noNumber) {
      let employee
      try {
        employee = createEmployee({ employeeNumber: 'PROYECTO', name: form.name })
      } catch (e) {
        setError(e.message)
        setSubmitting(false)
        return
      }
      applyCheckInResult(checkInEmployee({ employeeId: employee.id, areaId, stationId: form.stationId, shift: form.shift }))
      setSubmitting(false)
      return
    }

    applyCheckInResult(checkInEmployee({
      employeeId: form.employee?.id,
      employeeNumber,
      name: needsName ? form.name : undefined,
      areaId,
      stationId: form.stationId,
      shift: form.shift,
    }))
    setSubmitting(false)
  }

  const handleMove = () => {
    if (submitting || !conflict) return
    setSubmitting(true)

    // Un LIDER nunca reubica de una vez: la solicitud queda pendiente
    // hasta que un SUPERVISOR/ADMINISTRADOR la aprueba (peticion
    // explicita del usuario). SUPERVISOR/ADMINISTRADOR siguen moviendo
    // de inmediato, igual que siempre.
    if (isLider) {
      const res = requestMove({
        employeeId: conflict.employee.id,
        toAreaId: areaId,
        toStationId: form.stationId,
        shift: form.shift,
        requestedByUserId: user?.id,
        requestedByName: user?.name,
      })
      if (res.status === 'PENDING') {
        setPendingRequest(res.request)
        setStep('PENDING')
        onDone && onDone()
      } else {
        setError(res.message || 'No se pudo enviar la solicitud.')
      }
      setSubmitting(false)
      return
    }

    const res = moveEmployee({
      employeeId: conflict.employee.id,
      toAreaId: areaId,
      toStationId: form.stationId,
      shift: form.shift,
    })
    if (res.status === 'OK') {
      setResult({ employee: conflict.employee, assignment: res.assignment, eventLabel: 'Movido', eventTime: res.movedAt })
      setStep('SUCCESS')
      onDone && onDone()
    } else {
      setError(res.message || 'No se pudo mover al empleado.')
    }
    setSubmitting(false)
  }

  const handleRegisterAnother = () => {
    setForm(emptyForm(fixedAreaId))
    setStep('FORM')
    setError('')
    setConflict(null)
    setResult(null)
    setPendingRequest(null)
  }

  if (step === 'CONFLICT' && conflict) {
    const sameArea = conflict.assignment.areaId === areaId
    return (
      <Stack spacing={1.5}>
        <Typography sx={{ fontWeight: 800, fontSize: 17 }}>
          {conflict.employee.employeeNumber} — {conflict.employee.name}
        </Typography>
        <Alert severity="warning" sx={{ py: 0.5 }}>
          {sameArea
            ? 'Ya está registrado hoy en esta misma área, pero con otra forma de trabajo. Esto lo va a cambiar de estación/rol dentro de la misma área, no solo a contar su asistencia.'
            : 'Ya está registrado hoy en otra área. Esto lo va a mover de área, no solo a contar su asistencia.'}
        </Alert>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Actualmente hace</Typography>
          <Typography sx={{ fontWeight: 700 }}>
            {workCenterById(conflict.assignment.areaId)?.name || conflict.assignment.areaId} — {conflict.assignment.stationId}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Entrada: {conflict.assignment.checkInAt}</Typography>
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Va a pasar a hacer</Typography>
          <Typography sx={{ fontWeight: 700 }}>{areaName} — {form.stationId || '—'}</Typography>
        </Box>
        {isLider && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Como líder, este movimiento se enviará a un supervisor o administrador para su aprobación — no se aplica de inmediato.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ pt: 1 }}>
          <Button onClick={onCancel}>Mantener asignación actual</Button>
          <Button
            variant="contained"
            onClick={handleMove}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            {isLider ? `Enviar para aprobación — ${areaName}` : `Confirmar cambio — ${areaName}`}
          </Button>
        </Stack>
      </Stack>
    )
  }

  if (step === 'PENDING' && pendingRequest) {
    return (
      <Stack spacing={2} sx={{ textAlign: 'center', pt: 1 }}>
        <Box>
          <PendingActionsIcon sx={{ fontSize: 48, color: '#F59E0B', mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 2 }}>Movimiento enviado para aprobación</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
            {pendingRequest.employeeNumber} — {pendingRequest.employeeName}
          </Typography>
          <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1 }}>
            <Chip size="small" label={workCenterById(pendingRequest.toAreaId)?.name || pendingRequest.toAreaId} sx={ps.metricChip('info')} />
            <Chip size="small" label={pendingRequest.toStationId} sx={ps.metricChip('default')} />
          </Stack>
          <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
            Un supervisor o administrador debe verificarlo antes de que se aplique.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button onClick={handleRegisterAnother}>Registrar otro</Button>
          {onCancel && <Button variant="contained" onClick={onCancel} sx={{ fontWeight: 700 }}>Cerrar</Button>}
        </Stack>
      </Stack>
    )
  }

  if (step === 'SUCCESS' && result) {
    return (
      <Stack spacing={2} sx={{ textAlign: 'center', pt: 1 }}>
        <Box>
          <CheckCircleIcon sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 2 }}>
            {result.alreadyThere ? 'Ya estaba aquí — asistencia de hoy contada' : 'Registro realizado'}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
            {result.employee.employeeNumber} — {result.employee.name}
          </Typography>
          <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1 }}>
            <Chip size="small" label={workCenterById(result.assignment.areaId)?.name || result.assignment.areaId} sx={ps.metricChip('info')} />
            <Chip size="small" label={result.assignment.stationId} sx={ps.metricChip('default')} />
          </Stack>
          <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
            {result.assignment.shift} · {result.eventLabel} {result.eventTime}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button onClick={handleRegisterAnother}>Registrar otro</Button>
          {onCancel && <Button variant="contained" onClick={onCancel} sx={{ fontWeight: 700 }}>Cerrar</Button>}
        </Stack>
      </Stack>
    )
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}

      {!form.noNumber && <EmployeeSearchField autoFocus value={form.employee} onChange={handleSearch} />}

      <FormControlLabel
        control={<Checkbox size="small" checked={form.noNumber} onChange={(e) => handleToggleNoNumber(e.target.checked)} />}
        label="No tiene número de empleado"
      />

      {form.noNumber && (
        <>
          <Alert severity="info" sx={{ py: 0.5 }}>
            Se registrará como <b>PROYECTO</b> — se identifica por su nombre completo.
          </Alert>
          <TextField
            fullWidth
            autoFocus
            label="Nombre completo"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </>
      )}

      {needsName && (
        <>
          <Alert severity="warning" sx={{ py: 0.5 }}>Empleado {employeeNumber} no registrado — captura su nombre.</Alert>
          <TextField
            fullWidth
            label="Nombre completo"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </>
      )}

      {fixedAreaId ? (
        <TextField fullWidth label="Área / Línea" value={areaName} disabled sx={ps.inputSx} />
      ) : (
        <TextField select fullWidth label="Área / Línea" value={form.areaId} onChange={(e) => setForm(f => ({ ...f, areaId: e.target.value, stationId: '' }))}>
          {WORK_CENTERS.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
        </TextField>
      )}

      <TextField select fullWidth label="Rol / Estación de hoy" value={form.stationId} onChange={(e) => setForm(f => ({ ...f, stationId: e.target.value }))}>
        {stations.map((s) => {
          const occ = getStationOccupancy(areaId, s.name)
          const compatible = form.employee ? hasSkill(form.employee.id, s.name) : false
          return (
            <MenuItem key={s.id} value={s.name} disabled={occ.isFull}>
              {s.name} ({occ.count}/{occ.capacity}){occ.isFull ? ' — completa' : ''}{compatible ? ' ✓ habilidad' : ''}
            </MenuItem>
          )
        })}
      </TextField>

      <TextField select fullWidth label="Turno" value={form.shift} onChange={(e) => setForm(f => ({ ...f, shift: e.target.value }))}>
        {SHIFT_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
      </TextField>

      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 0.5 }}>
        {onCancel && <Button onClick={onCancel}>{cancelLabel}</Button>}
        <Button variant="contained" onClick={handleConfirm} disabled={!canSubmit || submitting} sx={{ fontWeight: 700 }}>
          Confirmar registro
        </Button>
      </Stack>
    </Stack>
  )
}
