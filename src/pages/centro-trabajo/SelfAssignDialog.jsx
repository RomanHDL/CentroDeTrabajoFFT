import React, { useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { usePageStyles } from '../../ui/pageStyles'
import { WORK_CENTERS, CURRENT_SHIFT, workCenterById } from '../../data/production/catalog'
import {
  getLineWorkstationsWithOccupancy,
  getLineCapacitySummary,
  getCurrentAssignment,
  checkInEmployee,
  hasSkill,
} from '../../data/personnel/repository'
import { STRICT_SKILL_VALIDATION } from '../../data/personnel/config'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeSearchField from './EmployeeSearchField'

/**
 * Flujo de autoasignacion (el propio empleado usa la
 * tablet). NUNCA mueve a alguien que ya tiene asignacion —
 * eso requiere un supervisor. Solo ofrece estaciones
 * realmente disponibles (respeta capacidad).
 */
export default function SelfAssignDialog({ open, onClose, fixedAreaId = null, onDone }) {
  const ps = usePageStyles()
  const [employee, setEmployee] = useState(null)
  const [notFoundNumber, setNotFoundNumber] = useState('')
  const [areaId, setAreaId] = useState(fixedAreaId || WORK_CENTERS[0].id)
  const [stationId, setStationId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const currentAssignment = useMemo(
    () => (employee ? getCurrentAssignment(employee.id) : null),
    [employee],
  )
  const lineCapacity = useMemo(() => getLineCapacitySummary(areaId), [areaId, open, result])
  const workstations = useMemo(
    () => getLineWorkstationsWithOccupancy(areaId),
    [areaId, open, result],
  )
  const availableStations = workstations.filter((w) => w.isAvailable)
  const skillOk = employee && stationId ? hasSkill(employee.id, stationId) : true

  const reset = () => {
    setEmployee(null)
    setNotFoundNumber('')
    setAreaId(fixedAreaId || WORK_CENTERS[0].id)
    setStationId('')
    setError('')
    setResult(null)
  }

  const handleSearch = (selected, typedText) => {
    setError('')
    if (selected) {
      setEmployee(selected)
      setNotFoundNumber('')
    } else {
      setEmployee(null)
      setNotFoundNumber(typedText || '')
    }
  }

  const handleConfirm = () => {
    if (submitting || !employee || !stationId) return
    setSubmitting(true)
    setError('')
    const res = checkInEmployee({
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      areaId,
      stationId,
      shift: CURRENT_SHIFT,
    })
    setSubmitting(false)
    if (res.status === 'OK') {
      setResult(res)
      onDone && onDone()
    } else if (res.status === 'STATION_FULL') {
      setError(res.message)
    } else if (res.status === 'CONFLICT') {
      setError('Ya tienes una asignación registrada hoy.')
    } else {
      setError(res.message || 'No se pudo completar el registro.')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {result ? (
        <>
          <DialogContent sx={{ pt: 4, pb: 2, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: '#10B981', mb: 1 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 2 }}>
              Registro realizado
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
              {result.employee.employeeNumber} — {result.employee.name}
            </Typography>
            <Stack direction="row" spacing={0.75} justifyContent="center" sx={{ mt: 1 }}>
              <Chip
                size="small"
                label={workCenterById(result.assignment.areaId)?.name}
                sx={ps.metricChip('info')}
              />
              <Chip
                size="small"
                label={result.assignment.stationId}
                sx={ps.metricChip('default')}
              />
            </Stack>
            <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
              Entrada: {result.assignment.checkInAt}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleClose} sx={{ fontWeight: 700 }}>
              Cerrar
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Registrarme / Autoasignarme</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <EmployeeSearchField
                autoFocus
                value={employee}
                onChange={handleSearch}
                label="Tu número o nombre"
              />

              {notFoundNumber && !employee && (
                <Alert severity="warning">
                  No encontramos a "{notFoundNumber}". Pide a tu supervisor que te dé de alta.
                </Alert>
              )}

              {employee && currentAssignment && (
                <Alert severity="info">
                  <Typography sx={{ fontWeight: 800 }}>Ya tienes una asignación</Typography>
                  {workCenterById(currentAssignment.areaId)?.name} — {currentAssignment.stationId} ·
                  Entrada {currentAssignment.checkInAt}
                  <br />
                  Solicita apoyo de un supervisor si necesitas cambiar.
                </Alert>
              )}

              {employee && !currentAssignment && (
                <>
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Hoy todavía no tienes asignación.
                  </Alert>

                  <TextField
                    select
                    fullWidth
                    label="Línea / Área"
                    value={areaId}
                    disabled={Boolean(fixedAreaId)}
                    onChange={(e) => {
                      setAreaId(e.target.value)
                      setStationId('')
                    }}
                  >
                    {WORK_CENTERS.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        {w.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  {lineCapacity.isFull ? (
                    <Alert severity="warning">
                      <Typography sx={{ fontWeight: 800 }}>LÍNEA COMPLETA</Typography>
                      Actualmente no hay estaciones disponibles en {workCenterById(areaId)?.name}.
                      Consulta con tu supervisor o elige otra línea.
                    </Alert>
                  ) : (
                    <TextField
                      select
                      fullWidth
                      label="Puesto disponible"
                      value={stationId}
                      onChange={(e) => setStationId(e.target.value)}
                    >
                      {availableStations.map((s) => (
                        <MenuItem key={s.id} value={s.name}>
                          {s.name}{' '}
                          {hasSkill(employee.id, s.name) ? '· compatible con tus habilidades' : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {stationId && !skillOk && (
                    <Alert severity="warning">
                      No tienes este rol registrado como habilidad
                      {STRICT_SKILL_VALIDATION ? '' : ', pero puedes continuar'}.
                    </Alert>
                  )}

                  {error && <Alert severity="error">{error}</Alert>}
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={handleClose}>Cancelar</Button>
            {employee && !currentAssignment && (
              <Button
                variant="contained"
                onClick={handleConfirm}
                disabled={!stationId || submitting || (STRICT_SKILL_VALIDATION && !skillOk)}
                sx={{ fontWeight: 700 }}
              >
                Asignarme aquí
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
