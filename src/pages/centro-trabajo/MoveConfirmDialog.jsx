import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { alertToneClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { getStationOccupancy, moveEmployee, requestMove } from '../../data/personnel/repository'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import { WORK_CENTERS, workCenterById } from '../../data/production/catalog'
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
        onDone?.({ pending: true, request: res.request })
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
      onDone?.(res)
      onClose()
    } else {
      setError(res.message || 'No se pudo mover al empleado.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover empleado</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-2">
          <p className="font-extrabold">
            {employee.employeeNumber} — {employee.name}
          </p>

          <div className="flex items-center gap-3 rounded-[20px] bg-black/[.04] p-3 dark:bg-white/[.08]">
            <div>
              <p className="text-[10.5px] font-bold uppercase text-muted-foreground">Origen</p>
              <p className="text-[13.5px] font-bold">{areaLabel(currentAssignment.areaId)}</p>
              <p className="text-[12.5px] text-muted-foreground">{currentAssignment.stationId}</p>
            </div>
            <ArrowRight className="text-muted-foreground" />
            <div>
              <p className="text-[10.5px] font-bold uppercase text-muted-foreground">Destino</p>
              <p className="text-[13.5px] font-bold">{areaLabel(toAreaId)}</p>
              <p className="text-[12.5px] text-muted-foreground">{toStationId || '—'}</p>
            </div>
          </div>

          {!presetTo && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="move-to-area">Línea destino</Label>
                <Select
                  value={toAreaId}
                  onValueChange={(v) => {
                    setToAreaId(v)
                    setToStationId('')
                  }}
                >
                  <SelectTrigger id="move-to-area">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_CENTERS.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="move-to-station">Estación destino</Label>
                <Select value={toStationId} onValueChange={setToStationId}>
                  <SelectTrigger id="move-to-station">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => {
                      const occ = getStationOccupancy(toAreaId, s.name, undefined, employee.id)
                      return (
                        <SelectItem key={s.id} value={s.name} disabled={occ.isFull}>
                          {s.name} ({occ.count}/{occ.capacity}){occ.isFull ? ' — completa' : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isLider && (
            <Alert className={cn(alertToneClass('info'), 'py-1')}>
              Como líder, este movimiento se enviará a un supervisor o administrador para su
              aprobación — no se aplica de inmediato.
            </Alert>
          )}
          {error && <Alert className={alertToneClass('error')}>{error}</Alert>}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!toStationId || submitting}
            className="font-bold"
          >
            {isLider ? 'Solicitar cambio' : 'Confirmar movimiento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
