import { approveMove, rejectMove } from './repository'
import { showToast } from '../../ui/toast'

/* Envoltorios compartidos de aprobar/rechazar con su toast -- usados tanto por el card de
   "Movimientos pendientes" (PersonalDeHoyTab.jsx) como por la campana del header (AppLayout.jsx,
   2026-08-25) para no duplicar el mismo par de mensajes en dos lugares. */
export function approvePendingMoveWithToast(id, userId) {
  const res = approveMove(id, userId)
  if (res.status === 'OK') showToast('Movimiento aprobado.', 'success')
  else showToast(res.message || 'No se pudo aprobar el movimiento.', 'error')
  return res
}

export function rejectPendingMoveWithToast(id, userId) {
  const res = rejectMove(id, userId)
  if (res.status === 'OK') showToast('Movimiento rechazado.', 'info')
  else showToast(res.message || 'No se pudo rechazar el movimiento.', 'error')
  return res
}
