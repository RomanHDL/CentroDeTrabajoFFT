import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getMovementsForDate, todayISO } from '../../data/personnel/repository'
import { workCenterById } from '../../data/production/catalog'
import { EmptyState } from '../../ui'

const MOVEMENT_LABEL = { CHECK_IN: 'Entrada', MOVE: 'Movimiento', RELEASE: 'Puesto liberado' }

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

export default function LineHistoryDialog({ lineId, open, onClose }) {
  // `open` fuerza refrescar los movimientos (getMovementsForDate) cada vez que el
  // dialogo se reabre, aunque no se lea dentro del callback -- comportamiento
  // original preservado tal cual.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const movements = useMemo(() => {
    if (!lineId) return []
    return getMovementsForDate(todayISO())
      .filter((m) => m.fromAreaId === lineId || m.toAreaId === lineId)
      .sort((a, b) => (a.movedAt < b.movedAt ? 1 : -1))
  }, [lineId, open])

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Historial de {workCenterById(lineId)?.name || lineId} — hoy</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto border-y border-border px-6 py-4">
          {movements.length === 0 ? (
            <EmptyState
              compact
              title="Sin movimientos hoy"
              description="No ha habido entradas ni movimientos en esta área hoy."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex gap-3 rounded-[20px] bg-black/[.04] p-[8.8px] dark:bg-white/[.08]"
                >
                  <p className="min-w-[44px] text-[13px] font-extrabold">{m.movedAt}</p>
                  <div>
                    <p className="text-[13px] font-bold">
                      {m.employeeNumber} · {MOVEMENT_LABEL[m.type] || m.type}
                    </p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {m.fromAreaId
                        ? `${areaLabel(m.fromAreaId)} / ${m.fromStationId} → ${m.toAreaId ? `${areaLabel(m.toAreaId)} / ${m.toStationId}` : 'sin asignación'}`
                        : `${areaLabel(m.toAreaId)} · ${m.toStationId}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
