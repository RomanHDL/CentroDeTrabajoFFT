import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { restoreBaselinePlacement } from '../../data/personnel/repository'
import { getSuppressedLinePeopleIds } from '../../data/production/personnelByArea'
import { showToast } from '../../ui/toast'

/* Inverso exacto de "Vaciar layout" (ClearLayoutPanel.jsx), a peticion
   explicita del usuario (2026-08-24): regresa al mapa visual, por su
   zona historica de BASE/LAYOUT FFT.xlsx, a quien quedo sin area por el
   boton "Vaciar layout" — sin inventar un puesto/estacion especifico
   dentro de la linea (el Excel no dice quien hace que puesto), igual
   que ya se ve hoy en Paletizado/Accesorios/Midea-High Value. Mismo
   alcance que "Vaciar layout": solo WC LINEA (LINEA1-10 + WC LINEA 0/
   Proyecto) y "PRODUCCION" generico — nunca toca a quien ya tiene una
   asignacion real de hoy (esas siempre ganan sobre el snapshot). */
export default function RestoreLayoutPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)

  function handleConfirm() {
    setConfirmOpen(false)
    const ids = getSuppressedLinePeopleIds()
    if (ids.length === 0) {
      showToast(
        'No hay nadie suprimido en las WC LINEA ahorita — no hace falta restaurar nada.',
        'info',
      )
      return
    }
    restoreBaselinePlacement(ids)
    setResult(ids.length)
    showToast(
      `Layout restaurado: ${ids.length} personas volvieron a su área de las WC LINEA.`,
      'success',
    )
  }

  return (
    <div className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">Restaurar layout de las WC LINEA</p>
      <p className="mb-4 text-[13px] text-muted-foreground">
        Regresa, en el mapa visual, a todo el personal que quedó sin área por "Vaciar layout" a su
        línea histórica de LAYOUT FFT.xlsx (sin puesto/estación inventado dentro de la línea — el
        Excel no dice quién hace qué puesto). Nunca toca a quien ya tiene una asignación real de hoy
        hecha desde Registro de personal.
      </p>
      {result != null && (
        <Alert className="mb-4 border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
          {result} personas volvieron a aparecer en su WC LINEA.
        </Alert>
      )}
      <Button
        variant="outline"
        className="border-[#10B981] font-bold normal-case text-[#10B981] hover:bg-[#10B981]/10"
        onClick={() => setConfirmOpen(true)}
      >
        <RotateCcw className="h-4 w-4" />
        Restaurar layout ahora
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(next) => !next && setConfirmOpen(false)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Restaurar layout de las WC LINEA</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 text-sm">
            Todo el personal suprimido de las WC LINEA volverá a ubicarse por su zona histórica de
            LAYOUT FFT.xlsx, sin puesto específico asignado (queda como "—" hasta que un líder lo
            registre de verdad). No afecta a quien ya tiene una asignación real hecha hoy.
            ¿Confirmas?
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleConfirm}>
              Restaurar layout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
