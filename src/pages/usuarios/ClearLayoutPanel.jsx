import { Eraser } from 'lucide-react'
import { useState } from 'react'
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
      showToast(
        'No hay nadie por snapshot en las WC LINEA ahorita — Calidad, Accesorios, Paletizado y las demás áreas de apoyo nunca se ven afectadas por este botón.',
        'info',
      )
      return
    }
    suppressBaselinePlacement(ids)
    setResult(ids.length)
    showToast(
      `Layout vaciado: ${ids.length} personas quedaron sin área hasta que se les reasigne.`,
      'success',
    )
  }

  return (
    <div className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">Vaciar layout de las WC LINEA</p>
      <p className="mb-4 text-[13px] text-muted-foreground">
        Deja sin área asignada, en el mapa visual, solo al personal de las WC LINEA (líneas de
        producción + WC LINEA 0) para que los líderes los vayan ubicando desde Registro de personal.
        Calidad, Capacitación, Team Leader, Soporte, Limpieza, Gerente, Supervisor, Accesorios y
        Paletizado nunca se ven afectados por este botón. No borra a nadie ni los quita de
        Personal/buscadores — solo del layout. A diferencia de liberar por hoy, esto no se revierte
        al cambiar de día.
      </p>
      {result != null && (
        <Alert className="mb-4 border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]">
          {result} personas quedaron sin ubicación en el layout.
        </Alert>
      )}
      <Button
        variant="outline"
        className="border-[#F59E0B] font-bold normal-case text-[#F59E0B] hover:bg-[#F59E0B]/10"
        onClick={() => setConfirmOpen(true)}
      >
        <Eraser className="h-4 w-4" />
        Vaciar layout ahora
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(next) => !next && setConfirmOpen(false)}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Vaciar layout de las WC LINEA</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 text-sm">
            Todo el personal ubicado hoy por el snapshot histórico en una WC LINEA quedará sin área
            en el mapa visual, de forma permanente hasta que alguien lo reasigne. Calidad,
            Capacitación, Team Leader, Soporte, Limpieza, Gerente, Supervisor, Accesorios y
            Paletizado no se tocan. Esto no afecta el módulo de Personal ni la búsqueda. ¿Confirmas?
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="warning" onClick={handleConfirm}>
              Vaciar layout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
