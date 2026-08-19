import React, { createContext, useContext, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { CURRENT_SHIFT, hasLineStations, workCenterById } from '../data/production/catalog'
import { getWorkstationsForLine } from '../data/personnel/workstations'
import { getCurrentAssignment, checkInEmployee, getEmployeeById, getLineWorkstationsWithOccupancy } from '../data/personnel/repository'
import { getAreaStaffing } from '../data/production/personnelByArea'
import MoveConfirmDialog from '../pages/centro-trabajo/MoveConfirmDialog'
import { showToast } from '../ui/toast'

/* ─────────────────────────────────────────────
   Orquesta TODO movimiento/asignacion originado por drag & drop (o
   por el equivalente en click de una tarjeta de personal), desde un
   solo lugar — para que "arrastrar a Yailen a Accesorios" y "tocar
   Asignar en la tarjeta de Yailen" terminen llamando exactamente a
   checkInEmployee/moveEmployee (repository.js), nunca una segunda
   logica paralela de asignaciones.

   Reglas que respeta:
   - Linea 1..10 requiere elegir una ESTACION antes de asignar (nunca
     se elige "Montaje" sola por soltar sobre la linea) — se abre un
     picker compacto de estaciones disponibles.
   - Areas WORK_AREA/SUPPORT_AREA usan su unico puesto generico, sin
     ambiguedad, sin picker.
   - Si el empleado ya tiene ubicacion hoy en otro lugar: se pide
     confirmacion ligera (MoveConfirmDialog) antes de mover — nunca
     se duplica (moveEmployee actualiza la misma fila de
     DailyAssignment, checkInEmployee/repository.js garantiza una
     sola asignacion ACTIVA por empleado/dia).
   - IDEAL nunca bloquea la asignacion (ver workstations.js) — solo
     se advierte con un toast si al asignar se supera la plantilla.
   ───────────────────────────────────────────── */

const DndAssignContext = createContext(null)

export function DndAssignProvider({ children }) {
  const [stationPicker, setStationPicker] = useState(null) // { employee, current, targetAreaId }
  const [moveTarget, setMoveTarget] = useState(null) // { employee, currentAssignment, presetTo }

  function warnIfOverIdeal(areaId) {
    const wc = workCenterById(areaId)
    if (!wc || wc.idealHeadcount == null) return
    const staffing = getAreaStaffing(areaId)
    if (staffing.real > wc.idealHeadcount) {
      showToast(`${wc.name} ya alcanzó su plantilla ideal de ${wc.idealHeadcount}.`, 'warning')
    }
  }

  function finalize(employee, current, targetAreaId, stationName) {
    const areaName = workCenterById(targetAreaId)?.name || targetAreaId
    const alreadyHere = current && current.areaId === targetAreaId && current.stationId === stationName
    if (alreadyHere) {
      showToast(`${employee.name} ya está asignado a ${areaName}.`, 'info')
      return
    }
    if (current) {
      setMoveTarget({ employee, currentAssignment: current, presetTo: { areaId: targetAreaId, stationId: stationName } })
      return
    }
    const res = checkInEmployee({
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      areaId: targetAreaId,
      stationId: stationName,
      shift: CURRENT_SHIFT,
    })
    if (res.status === 'OK') {
      showToast(`${employee.name} asignado a ${areaName}.`)
      warnIfOverIdeal(targetAreaId)
    } else {
      showToast(res.message || 'No se pudo asignar.', 'error')
    }
  }

  function requestAssign(employeeId, targetAreaId) {
    const employee = getEmployeeById(employeeId)
    if (!employee) return
    const current = getCurrentAssignment(employeeId)
    if (hasLineStations(targetAreaId)) {
      if (current && current.areaId === targetAreaId) {
        showToast(`${employee.name} ya está en ${workCenterById(targetAreaId)?.name}.`, 'info')
        return
      }
      setStationPicker({ employee, current, targetAreaId })
      return
    }
    const stationName = getWorkstationsForLine(targetAreaId)[0]?.name
    finalize(employee, current, targetAreaId, stationName)
  }

  function requestAssignToStation(employeeId, targetAreaId, stationName) {
    const employee = getEmployeeById(employeeId)
    if (!employee) return
    const current = getCurrentAssignment(employeeId)
    finalize(employee, current, targetAreaId, stationName)
  }

  const value = useMemo(() => ({ requestAssign, requestAssignToStation }), [])

  const pickerStations = stationPicker ? getLineWorkstationsWithOccupancy(stationPicker.targetAreaId) : []

  return (
    <DndAssignContext.Provider value={value}>
      {children}

      <Dialog open={Boolean(stationPicker)} onClose={() => setStationPicker(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {stationPicker && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              Elige una estación — {workCenterById(stationPicker.targetAreaId)?.name}
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
                Asignando a <b>{stationPicker.employee.name}</b>. Soltar sobre la línea no elige estación
                automáticamente — selecciona una disponible:
              </Typography>
              <Stack spacing={1}>
                {pickerStations.map((s) => (
                  <Stack
                    key={s.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    onClick={() => {
                      if (!s.isAvailable) return
                      const { employee, current, targetAreaId } = stationPicker
                      setStationPicker(null)
                      finalize(employee, current, targetAreaId, s.name)
                    }}
                    sx={{
                      p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                      cursor: s.isAvailable ? 'pointer' : 'not-allowed', opacity: s.isAvailable ? 1 : 0.5,
                      '&:hover': s.isAvailable ? { borderColor: '#3B82F6' } : {},
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{s.name}</Typography>
                    <Chip
                      size="small"
                      label={s.isAvailable ? 'Disponible' : `${s.occupants.length}/${s.capacity} completa`}
                      sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: s.isAvailable ? '#10B98122' : '#94A3B822', color: s.isAvailable ? '#047857' : '#64748B' }}
                    />
                  </Stack>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={() => setStationPicker(null)}>Cancelar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {moveTarget && (
        <MoveConfirmDialog
          open={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          employee={moveTarget.employee}
          currentAssignment={moveTarget.currentAssignment}
          presetTo={moveTarget.presetTo}
          onDone={() => {
            const fromName = workCenterById(moveTarget.currentAssignment.areaId)?.name || moveTarget.currentAssignment.areaId
            const toName = workCenterById(moveTarget.presetTo.areaId)?.name || moveTarget.presetTo.areaId
            showToast(`${moveTarget.employee.name} movido de ${fromName} a ${toName}.`)
            warnIfOverIdeal(moveTarget.presetTo.areaId)
            setMoveTarget(null)
          }}
        />
      )}
    </DndAssignContext.Provider>
  )
}

export function useDndAssign() {
  return useContext(DndAssignContext)
}
