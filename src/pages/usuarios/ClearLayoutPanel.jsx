import { Eraser } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { suppressBaselinePlacement } from '../../data/personnel/repository'
import { getBaselineOnlyPeopleIds } from '../../data/production/personnelByArea'
import { showToast } from '../../ui/toast'

/* Vaciar el layout de "Areas de trabajo" a peticion explicita del usuario
   (2026-08-21): quiere probar que los lideres puedan ir ubicando a cada
   persona desde cero. Un release/movimiento normal solo dura "por hoy" y
   se revierte solo al cambiar de dia (confirmado en produccion) -- esto
   usa suppressBaselinePlacement, que NO tiene fecha de vencimiento: la
   persona se queda sin area hasta que alguien la asigne de verdad
   (checkInEmployee/moveEmployee la reactivan automaticamente). Nunca
   toca el snapshot historico (realPersonnelSnapshot.js) ni el modulo de
   Personal/buscadores -- eso sigue mostrando a todos igual, solo cambia
   donde aparecen en el layout visual. Solo ADMINISTRADOR (ver
   UsuariosPage), es una accion de mantenimiento, no del dia a dia.

   Alcance reducido 2026-08-24 (a peticion explicita del usuario): ya NO
   afecta a Calidad, Capacitacion, Team Leader, Soporte, Limpieza,
   Gerente, Supervisor, Accesorios ni Paletizado (son areas fijas que
   casi no rotan) -- getBaselineOnlyPeopleIds() ya excluye esas areas
   (ver PROTECTED_FROM_LAYOUT_CLEAR_AREAS en personnelByArea.js). Solo
   sigue vaciando las WC LINEA (LINEA1-10 + WC LINEA 0/Proyecto), que son
   las que de verdad cambian de personal dia a dia. */
export default function ClearLayoutPanel() {
  const { t } = useTranslation('usuarios')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)

  function handleConfirm() {
    setConfirmOpen(false)
    // Solo la ubicacion HISTORICA (snapshot BASE) de las WC LINEA --
    // nunca a quien ya tiene una asignacion real de hoy
    // (checkInEmployee/moveEmployee), eso seria borrar un movimiento
    // real que un lider/supervisor acaba de hacer (bug real detectado
    // en produccion 2026-08-21), ni a las areas fijas protegidas
    // (Calidad, Capacitacion, Team Leader, Soporte, Limpieza, Gerente,
    // Supervisor, Accesorios, Paletizado -- ver getBaselineOnlyPeopleIds).
    const ids = getBaselineOnlyPeopleIds()
    if (ids.length === 0) {
      showToast(t('clearLayoutPanel.toastNoneFound'), 'info')
      return
    }
    suppressBaselinePlacement(ids)
    setResult(ids.length)
    showToast(t('clearLayoutPanel.toastSuccess', { total: ids.length }), 'success')
  }

  return (
    <div className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">{t('clearLayoutPanel.title')}</p>
      <p className="mb-4 text-[13px] text-muted-foreground">{t('clearLayoutPanel.subtitle')}</p>
      {result != null && (
        <Alert className="mb-4 border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
          {t('clearLayoutPanel.resultBanner', { total: result })}
        </Alert>
      )}
      <Button
        variant="outline"
        className="border-[#F59E0B] font-bold normal-case text-[#F59E0B] hover:bg-[#F59E0B]/10"
        onClick={() => setConfirmOpen(true)}
      >
        <Eraser className="h-4 w-4" />
        {t('clearLayoutPanel.buttonAction')}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(next) => !next && setConfirmOpen(false)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('clearLayoutPanel.title')}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 text-sm">{t('clearLayoutPanel.dialogConfirmText')}</div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('clearLayoutPanel.cancel')}
            </Button>
            <Button variant="warning" onClick={handleConfirm}>
              {t('clearLayoutPanel.confirmButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
