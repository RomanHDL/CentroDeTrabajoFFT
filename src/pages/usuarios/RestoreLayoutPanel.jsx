import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('usuarios')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)

  function handleConfirm() {
    setConfirmOpen(false)
    const ids = getSuppressedLinePeopleIds()
    if (ids.length === 0) {
      showToast(t('restoreLayoutPanel.toastNoneFound'), 'info')
      return
    }
    restoreBaselinePlacement(ids)
    setResult(ids.length)
    showToast(t('restoreLayoutPanel.toastSuccess', { total: ids.length }), 'success')
  }

  return (
    <div className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">{t('restoreLayoutPanel.title')}</p>
      <p className="mb-4 text-[13px] text-muted-foreground">{t('restoreLayoutPanel.subtitle')}</p>
      {result != null && (
        <Alert className="mb-4 border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
          {t('restoreLayoutPanel.resultBanner', { total: result })}
        </Alert>
      )}
      <Button
        variant="outline"
        className="border-[#10B981] font-bold normal-case text-[#10B981] hover:bg-[#10B981]/10"
        onClick={() => setConfirmOpen(true)}
      >
        <RotateCcw className="h-4 w-4" />
        {t('restoreLayoutPanel.buttonAction')}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(next) => !next && setConfirmOpen(false)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('restoreLayoutPanel.title')}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 text-sm">{t('restoreLayoutPanel.dialogConfirmText')}</div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('restoreLayoutPanel.cancel')}
            </Button>
            <Button variant="success" onClick={handleConfirm}>
              {t('restoreLayoutPanel.confirmButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
