import { createContext, useContext, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatEmployeeNumber } from '../data/personnel/employeeDisplay'
import {
  checkInEmployee,
  getAssignmentsForArea,
  getCurrentAssignment,
  getEmployeeById,
  getLineWorkstationsWithOccupancy,
  releaseAssignment,
  swapOrBumpStation,
} from '../data/personnel/repository'
import { getWorkstationsForLine, hasMultipleStations } from '../data/personnel/workstations'
import { CURRENT_SHIFT, workCenterById } from '../data/production/catalog'
import { getAreaStaffing, getEffectiveAreaForEmployee } from '../data/production/personnelByArea'
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
  const [releaseTarget, setReleaseTarget] = useState(null) // { employee, currentAssignment }
  const [swapTarget, setSwapTarget] = useState(null) // { employeeA, employeeB, current, targetAreaId, stationName }

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
    const alreadyHere =
      current && current.areaId === targetAreaId && current.stationId === stationName
    if (alreadyHere) {
      showToast(`${employee.name} ya está asignado a ${areaName}.`, 'info')
      return
    }
    if (current) {
      setMoveTarget({
        employee,
        currentAssignment: current,
        presetTo: { areaId: targetAreaId, stationId: stationName },
      })
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
    // 2026-08-26: antes se usaba hasLineStations() (solo type===PRODUCTION_LINE)
    // -- ahora Accesorios/Paletizado/Insumos/Midea tambien tienen multiples
    // estaciones reales sin ser WC LINEA, asi que el guard es por CANTIDAD
    // real de estaciones, no por tipo de area (ver workstations.js/hasMultipleStations).
    if (hasMultipleStations(targetAreaId)) {
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

  /* Si la estacion destino ya tiene OTRA persona hoy, no se bloquea
     (2026-08-26, peticion explicita del usuario) -- se pide confirmar
     un intercambio real: swapOrBumpStation (repository.js) decide si
     es swap (ambos ya asignados) o "bump" (A no tenia asignacion, B
     queda liberado). */
  function requestAssignToStation(employeeId, targetAreaId, stationName) {
    const employee = getEmployeeById(employeeId)
    if (!employee) return
    const occupied = getAssignmentsForArea(targetAreaId).find((a) => a.stationId === stationName)
    if (occupied && occupied.employeeId !== employeeId) {
      const occupant = getEmployeeById(occupied.employeeId)
      if (occupant) {
        const current = getCurrentAssignment(employeeId)
        setSwapTarget({
          employeeA: employee,
          employeeB: occupant,
          current,
          targetAreaId,
          stationName,
        })
        return
      }
    }
    const current = getCurrentAssignment(employeeId)
    finalize(employee, current, targetAreaId, stationName)
  }

  function confirmSwap() {
    if (!swapTarget) return
    const { employeeA, employeeB, targetAreaId, stationName } = swapTarget
    const res = swapOrBumpStation({
      employeeIdA: employeeA.id,
      toAreaId: targetAreaId,
      toStationId: stationName,
    })
    if (res.status === 'OK') {
      if (res.bumpedEmployeeId) {
        showToast(
          `${employeeA.name} ocupó el puesto de ${employeeB.name}; ${employeeB.name} quedó sin asignación.`,
        )
      } else {
        showToast(`${employeeA.name} y ${employeeB.name} intercambiaron de puesto.`)
      }
      warnIfOverIdeal(targetAreaId)
    } else {
      showToast(res.message || 'No se pudo intercambiar.', 'error')
    }
    setSwapTarget(null)
  }

  /* Quitar a alguien de su area actual (sin asignarlo a otro lado) —
     pide confirmacion ligera y termina el DailyAssignment activo via
     releaseAssignment (repository.js: quita la fila, agrega un
     EmployeeMovement tipo RELEASE, conserva historial).

     Si la persona nunca fue "tocada" hoy (solo aparece en un area
     por su zona del snapshot de BASE, sin DailyAssignment real) no
     hay fila que borrar — se usa el area EFECTIVA (la misma que ve
     el layout, getEffectiveAreaForEmployee) como origen para que el
     RELEASE quede registrado igual y la persona deje de contarse
     ahi. Si no aparece en ninguna area, no hay nada que quitar. */
  function requestRelease(employeeId) {
    const employee = getEmployeeById(employeeId)
    if (!employee) return
    const current = getCurrentAssignment(employeeId)
    const effectiveAreaId = current?.areaId || getEffectiveAreaForEmployee(employeeId)
    if (!effectiveAreaId) return
    setReleaseTarget({
      employee,
      currentAssignment: current || { areaId: effectiveAreaId, stationId: null },
    })
  }

  function confirmRelease() {
    if (!releaseTarget) return
    const { employee, currentAssignment } = releaseTarget
    const areaName = workCenterById(currentAssignment.areaId)?.name || currentAssignment.areaId
    const res = releaseAssignment(employee.id, currentAssignment.areaId)
    if (res.status === 'OK') {
      showToast(`${employee.name} removido de ${areaName}.`)
    } else {
      showToast(res.message || 'No se pudo quitar la asignación.', 'error')
    }
    setReleaseTarget(null)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: value se memoiza UNA sola vez a proposito -- las 3 funciones solo llaman setters de useState (identidad estable entre renders) y nunca leen stationPicker/moveTarget/releaseTarget/swapTarget por closure, asi que recrearlas en cada render solo forzaria un re-render innecesario de todo consumidor de useDndAssign().
  const value = useMemo(() => ({ requestAssign, requestAssignToStation, requestRelease }), [])

  const pickerStations = stationPicker
    ? getLineWorkstationsWithOccupancy(stationPicker.targetAreaId)
    : []

  return (
    <DndAssignContext.Provider value={value}>
      {children}

      <Dialog
        open={Boolean(stationPicker)}
        onOpenChange={(next) => !next && setStationPicker(null)}
      >
        <DialogContent>
          {stationPicker && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Elige una estación — {workCenterById(stationPicker.targetAreaId)?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6">
                <p className="text-[13px] text-muted-foreground">
                  Asignando a <b>{stationPicker.employee.name}</b>
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  No. empleado: <b>{formatEmployeeNumber(stationPicker.employee.employeeNumber)}</b>{' '}
                  · Soltar sobre la línea no elige estación automáticamente — selecciona una
                  disponible:
                </p>
                <div className="flex flex-col gap-2">
                  {pickerStations.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!s.isAvailable}
                      onClick={() => {
                        const { employee, current, targetAreaId } = stationPicker
                        setStationPicker(null)
                        finalize(employee, current, targetAreaId, s.name)
                      }}
                      className={cn(
                        'flex items-center justify-between rounded-[20px] border border-border p-2.5 text-left transition-colors',
                        s.isAvailable
                          ? 'cursor-pointer hover:border-blue-500'
                          : 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <span className="text-[13.5px] font-bold">{s.name}</span>
                      <span
                        className={cn(
                          'inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-bold',
                          s.isAvailable
                            ? 'bg-emerald-500/[0.13] text-emerald-700'
                            : 'bg-slate-400/[0.13] text-slate-500',
                        )}
                      >
                        {s.isAvailable
                          ? 'Disponible'
                          : `${s.occupants.length}/${s.capacity} completa`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <Button variant="outline" onClick={() => setStationPicker(null)}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {moveTarget && (
        <MoveConfirmDialog
          open={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          employee={moveTarget.employee}
          currentAssignment={moveTarget.currentAssignment}
          presetTo={moveTarget.presetTo}
          onDone={(res) => {
            const toName =
              workCenterById(moveTarget.presetTo.areaId)?.name || moveTarget.presetTo.areaId
            if (res?.pending) {
              showToast(
                `Solicitud de movimiento de ${moveTarget.employee.name} enviada para aprobación.`,
                'info',
              )
            } else {
              const fromName =
                workCenterById(moveTarget.currentAssignment.areaId)?.name ||
                moveTarget.currentAssignment.areaId
              showToast(`${moveTarget.employee.name} movido de ${fromName} a ${toName}.`)
              warnIfOverIdeal(moveTarget.presetTo.areaId)
            }
            setMoveTarget(null)
          }}
        />
      )}

      <Dialog open={Boolean(swapTarget)} onOpenChange={(next) => !next && setSwapTarget(null)}>
        <DialogContent>
          {swapTarget && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {swapTarget.current ? 'Intercambiar puesto' : 'Puesto ocupado'}
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 text-sm">
                {swapTarget.current ? (
                  <p>
                    <b>{swapTarget.employeeA.name}</b> tomará el puesto de{' '}
                    <b>{swapTarget.employeeB.name}</b> en{' '}
                    <b>{workCenterById(swapTarget.targetAreaId)?.name}</b> ({swapTarget.stationName}
                    ), y <b>{swapTarget.employeeB.name}</b> pasará al puesto que dejó{' '}
                    <b>{swapTarget.employeeA.name}</b> en{' '}
                    <b>{workCenterById(swapTarget.current.areaId)?.name}</b> (
                    {swapTarget.current.stationId}).
                  </p>
                ) : (
                  <p>
                    <b>{swapTarget.stationName}</b> ya está ocupada por{' '}
                    <b>{swapTarget.employeeB.name}</b>. Si continúas,{' '}
                    <b>{swapTarget.employeeA.name}</b> tomará ese puesto y{' '}
                    <b>{swapTarget.employeeB.name}</b> quedará sin asignación.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <Button variant="outline" onClick={() => setSwapTarget(null)}>
                  Cancelar
                </Button>
                <Button onClick={confirmSwap} className="font-bold">
                  {swapTarget.current ? 'Intercambiar' : 'Ocupar puesto'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(releaseTarget)}
        onOpenChange={(next) => !next && setReleaseTarget(null)}
      >
        <DialogContent>
          {releaseTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Quitar del área</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 text-sm">
                ¿Quitar a <b>{releaseTarget.employee.name}</b> de{' '}
                <b>
                  {workCenterById(releaseTarget.currentAssignment.areaId)?.name ||
                    releaseTarget.currentAssignment.areaId}
                </b>
                ?
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
                <Button variant="outline" onClick={() => setReleaseTarget(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={confirmRelease} className="font-bold">
                  Quitar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DndAssignContext.Provider>
  )
}

export function useDndAssign() {
  return useContext(DndAssignContext)
}
