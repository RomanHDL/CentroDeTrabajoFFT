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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { WORK_CENTERS, workCenterById } from '../../data/production/catalog'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import { getStationOccupancy, moveEmployee, requestMove } from '../../data/personnel/repository'
import { useAuth } from '../../state/auth'

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

/**
 * Confirma mover a un empleado ya asignado hoy a otra
 * linea/estacion. Si se recibe `presetTo`, el destino ya se
 * conoce (viene de una sugerencia o de una estacion vacia
 * concreta) y solo se pide confirmar; si no, deja elegir
 * linea+estacion (respetando capacidad).
 */
export default function MoveConfirmDialog({
  open,
  onClose,
  employee,
  currentAssignment,
  presetTo,
  onDone,
}) {
  const { user } = useAuth()
  const isLider = user?.role === 'LIDER'
  const [toAreaId, setToAreaId] = useState(
    presetTo?.areaId || currentAssignment?.areaId || WORK_CENTERS[0].id,
  )
  const [toStationId, setToStationId] = useState(presetTo?.stationId || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const stations = useMemo(() => getWorkstationsForLine(toAreaId), [toAreaId])

  if (!employee || !currentAssignment) return null

  // Un LIDER nunca mueve directo entre areas (peticion explicita del usuario, igual que
  // RegisterPersonnelForm.jsx): la solicitud queda pendiente hasta que un SUPERVISOR/
  // ADMINISTRADOR la aprueba. Drag&drop y el formulario de registro comparten esta misma regla
  // para no dejar un segundo camino que la evada.
  const handleConfirm = () => {
    if (submitting) return
    setSubmitting(true)
    setError('')

    if (isLider) {
      const res = requestMove({
        employeeId: employee.id,
        toAreaId,
        toStationId,
        shift: currentAssignment.shift,
        requestedByUserId: user?.id,
        requestedByName: user?.name,
      })
      setSubmitting(false)
      if (res.status === 'PENDING') {
        onDone && onDone({ pending: true, request: res.request })
        onClose()
      } else {
        setError(res.message || 'No se pudo enviar la solicitud.')
      }
      return
    }

    const res = moveEmployee({
      employeeId: employee.id,
      toAreaId,
      toStationId,
      shift: currentAssignment.shift,
    })
    setSubmitting(false)
    if (res.status === 'OK') {
      onDone && onDone(res)
      onClose()
    } else {
      setError(res.message || 'No se pudo mover al empleado.')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Mover empleado</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography sx={{ fontWeight: 800 }}>
            {employee.employeeNumber} — {employee.name}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                }}
              >
                Origen
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                {areaLabel(currentAssignment.areaId)}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                {currentAssignment.stationId}
              </Typography>
            </Box>
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                }}
              >
                Destino
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                {areaLabel(toAreaId)}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                {toStationId || '—'}
              </Typography>
            </Box>
          </Stack>

          {!presetTo && (
            <>
              <TextField
                select
                fullWidth
                label="Línea destino"
                value={toAreaId}
                onChange={(e) => {
                  setToAreaId(e.target.value)
                  setToStationId('')
                }}
              >
                {WORK_CENTERS.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Estación destino"
                value={toStationId}
                onChange={(e) => setToStationId(e.target.value)}
              >
                {stations.map((s) => {
                  const occ = getStationOccupancy(toAreaId, s.name, undefined, employee.id)
                  return (
                    <MenuItem key={s.id} value={s.name} disabled={occ.isFull}>
                      {s.name} ({occ.count}/{occ.capacity}){occ.isFull ? ' — completa' : ''}
                    </MenuItem>
                  )
                })}
              </TextField>
            </>
          )}

          {isLider && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Como líder, este movimiento se enviará a un supervisor o administrador para su
              aprobación — no se aplica de inmediato.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!toStationId || submitting}
          sx={{ fontWeight: 700 }}
        >
          {isLider ? 'Solicitar cambio' : 'Confirmar movimiento'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
