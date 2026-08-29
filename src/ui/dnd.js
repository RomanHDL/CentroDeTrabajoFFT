import { useState } from 'react'
import { useDndAssign } from '../state/dndAssign'

/* ─────────────────────────────────────────────
   Drag & drop de personal — HTML5 DnD nativo (sin libreria nueva).
   Cubre mouse/desktop. En touch (tablet) el HTML5 DnD no dispara de
   forma confiable, por eso CADA superficie que usa estos hooks
   conserva su equivalente de click ("Asignar aqui" / "Asignar
   empleado" / seleccionar estacion) como alternativa real, no solo
   decorativa — accesibilidad y tablet dependen de esa alternativa,
   no del drag.
   ───────────────────────────────────────────── */

const MIME = 'application/x-employee-id'

export function useEmployeeDragSource(employeeId) {
  const [dragging, setDragging] = useState(false)
  return {
    dragging,
    dragProps: {
      draggable: true,
      onDragStart: (e) => {
        e.dataTransfer.setData(MIME, employeeId)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      },
      onDragEnd: () => setDragging(false),
    },
  }
}

/* Suelta sobre una zona/area/linea completa — si es Linea 1..10 abre
   el picker de estacion (nunca elige una sola). */
export function useEmployeeDropTarget(areaId, { disabled = false } = {}) {
  const dnd = useDndAssign()
  return useDropHandlers(areaId && !disabled ? (employeeId) => dnd.requestAssign(employeeId, areaId) : null)
}

/* Suelta sobre una estacion especifica ya conocida (tarjeta dentro de
   "Distribucion de estaciones") — solo aplica si esta disponible. */
export function useEmployeeDropTargetStation(areaId, stationName, { disabled = false } = {}) {
  const dnd = useDndAssign()
  return useDropHandlers(areaId && stationName && !disabled ? (employeeId) => dnd.requestAssignToStation(employeeId, areaId, stationName) : null)
}

/* Suelta sobre "Personal disponible" (o una zona "Quitar
   asignacion") — quita a la persona de su area actual en vez de
   asignarla a algo. Si la persona no tenia asignacion hoy,
   requestRelease no hace nada (no hay nada que quitar). */
export function useEmployeeDropTargetRelease({ disabled = false } = {}) {
  const dnd = useDndAssign()
  return useDropHandlers(!disabled ? (employeeId) => dnd.requestRelease(employeeId) : null)
}

function useDropHandlers(onEmployeeDropped) {
  const [isOver, setIsOver] = useState(false)

  if (!onEmployeeDropped) {
    return { isOver: false, dropProps: {} }
  }

  return {
    isOver,
    dropProps: {
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes(MIME)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      },
      onDragEnter: (e) => {
        if (!e.dataTransfer.types.includes(MIME)) return
        setIsOver(true)
      },
      onDragLeave: () => setIsOver(false),
      onDrop: (e) => {
        const employeeId = e.dataTransfer.getData(MIME)
        setIsOver(false)
        if (!employeeId) return
        e.preventDefault()
        e.stopPropagation()
        onEmployeeDropped(employeeId)
      },
    },
  }
}
