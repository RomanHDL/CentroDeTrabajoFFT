import React, { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { usePageStyles } from '../../ui/pageStyles'
import { WORK_CENTERS, SHIFT_OPTIONS, CURRENT_SHIFT, workCenterById } from '../../data/production/catalog'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import { checkInEmployee, moveEmployee, getStationOccupancy, hasSkill } from '../../data/personnel/repository'
import EmployeeSearchField from './EmployeeSearchField'

const emptyForm = (fixedAreaId) => ({
  employee: null,
  employeeNumberTyped: '',
  name: '',
  areaId: fixedAreaId || WORK_CENTERS[0].id,
  stationId: '',
  shift: CURRENT_SHIFT,
})

/**
 * Registro de personal por SUPERVISOR (check-in diario) +
 * resolucion de conflicto cuando el empleado ya tiene
 * ubicacion hoy. Busca por numero o nombre.
 *
 * fixedAreaId: si se abre desde dentro de una linea, el area
 * ya se conoce y no se vuelve a pedir (menos toques en tablet).
 */
export default function RegisterPersonnelDialog({ open, onClose, fixedAreaId = null, onDone }) {
  const ps = usePageStyles()
  const [form, setForm] = useState(() => emptyForm(fixedAreaId))
  const [step, setStep] = useState('FORM') // FORM | CONFLICT | SUCCESS
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (open) {
      setForm(emptyForm(fixedAreaId))
      setStep('FORM')
      setError('')
      setConflict(null)
      setResult(null)
    }
  }, [open, fixedAreaId])

  const areaId = fixedAreaId || form.areaId
  const areaName = workCenterById(areaId)?.name || areaId
  const stations = useMemo(() => getWorkstationsForLine(areaId), [areaId])

  const employeeNumber = form.employee?.employeeNumber || form.employeeNumberTyped
  const needsName = employeeNumber.trim().length > 0 && !form.employee

  const canSubmit = employeeNumber.trim() && form.stationId && areaId && (!needsName || form.name.trim())

  const handleSearch = (selected, typedText) => {
    setForm(f => ({ ...f, employee: selected, employeeNumberTyped: selected ? selected.employeeNumber : (typedText || '') }))
  }

  const handleConfirm = () => {
    if (submitting || !canSubmit) return
    setSubmitting(true)
    setError('')

    const res = checkInEmployee({
      employeeId: form.employee?.id,
      employeeNumber,
      name: needsName ? form.name : undefined,
      areaId,
      stationId: form.stationId,
      shift: form.shift,
    })

    if (res.status === 'OK') {
      setResult({ employee: res.employee, assignment: res.assignment, eventLabel: 'Entrada', eventTime: res.assignment.checkInAt })
      setStep('SUCCESS')
      onDone && onDone()
    } else if (res.status === 'CONFLICT') {
      setConflict(res)
      setStep('CONFLICT')
    } else if (res.status === 'STATION_FULL') {
      setError(res.message)
    } else if (res.status === 'NEEDS_NAME') {
      setError('Este número de empleado no está registrado. Captura su nombre para darlo de alta.')
    } else {
      setError(res.message || 'No se pudo registrar. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  const handleMove = () => {
    if (submitting || !conflict) return
    setSubmitting(true)
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
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      {step === 'FORM' && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>+ Registrar personal</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <EmployeeSearchField autoFocus value={form.employee} onChange={handleSearch} />

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
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="contained" onClick={handleConfirm} disabled={!canSubmit || submitting} sx={{ fontWeight: 700 }}>
              Confirmar registro
            </Button>
          </DialogActions>
        </>
      )}

      {step === 'CONFLICT' && conflict && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Empleado ya asignado</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5}>
              <Typography sx={{ fontWeight: 800, fontSize: 17 }}>
                {conflict.employee.employeeNumber} — {conflict.employee.name}
              </Typography>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Actualmente</Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {workCenterById(conflict.assignment.areaId)?.name || conflict.assignment.areaId} — {conflict.assignment.stationId}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Entrada: {conflict.assignment.checkInAt}</Typography>
              </Box>
              {conflict.assignment.areaId !== areaId && (
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Nueva ubicación: <b>{areaName}</b> — {form.stationId}
                </Typography>
              )}
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
            <Button onClick={onClose}>Mantener asignación actual</Button>
            <Button
              variant="contained"
              onClick={handleMove}
              disabled={submitting || conflict.assignment.areaId === areaId}
              sx={{ fontWeight: 700 }}
            >
              Mover a {areaName}
            </Button>
          </DialogActions>
        </>
      )}

      {step === 'SUCCESS' && result && (
        <>
          <DialogContent sx={{ pt: 4, pb: 2, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 2 }}>Registro realizado</Typography>
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
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'center', gap: 1 }}>
            <Button onClick={handleRegisterAnother}>Registrar otro</Button>
            <Button variant="contained" onClick={onClose} sx={{ fontWeight: 700 }}>Cerrar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
