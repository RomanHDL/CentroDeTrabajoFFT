import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import RegisterPersonnelForm from './RegisterPersonnelForm'

/**
 * Registro de personal por SUPERVISOR (check-in diario), en dialogo
 * modal — misma logica que la pagina "Registro de personal"
 * (RegisterPersonnelForm centraliza todo, ver ese archivo).
 */
export default function RegisterPersonnelDialog({ open, onClose, fixedAreaId = null, onDone }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>+ Registrar personal</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {open && (
            <RegisterPersonnelForm fixedAreaId={fixedAreaId} onCancel={onClose} onDone={onDone} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
