import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import RegisterPersonnelForm from './RegisterPersonnelForm'

/**
 * Registro de personal por SUPERVISOR (check-in diario), en dialogo
 * modal — misma logica que la pagina "Registro de personal"
 * (RegisterPersonnelForm centraliza todo, ver ese archivo).
 */
export default function RegisterPersonnelDialog({ open, onClose, fixedAreaId = null, onDone }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>+ Registrar personal</DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        {open && <RegisterPersonnelForm fixedAreaId={fixedAreaId} onCancel={onClose} onDone={onDone} />}
      </DialogContent>
    </Dialog>
  )
}
