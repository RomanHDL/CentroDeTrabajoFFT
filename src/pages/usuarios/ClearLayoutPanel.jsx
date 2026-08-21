import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import LayersClearIcon from '@mui/icons-material/LayersClear'
import { getPeopleByArea } from '../../data/production/personnelByArea'
import { suppressBaselinePlacement } from '../../data/personnel/repository'
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
   UsuariosPage), es una accion de mantenimiento, no del dia a dia. */
export default function ClearLayoutPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)

  function handleConfirm() {
    setConfirmOpen(false)
    const byArea = getPeopleByArea()
    const ids = Object.values(byArea).flat().map((p) => p.id)
    if (ids.length === 0) {
      showToast('No hay nadie ubicado en el layout actualmente.', 'info')
      return
    }
    suppressBaselinePlacement(ids)
    setResult(ids.length)
    showToast(`Layout vaciado: ${ids.length} personas quedaron sin área hasta que se les reasigne.`, 'success')
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mt: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 0.5 }}>Vaciar layout de áreas de trabajo</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Deja a todo el personal sin área asignada en el mapa visual (para que los líderes los vayan ubicando desde
        Registro de personal). No borra a nadie ni los quita de Personal/buscadores — solo del layout. A diferencia de
        liberar por hoy, esto no se revierte al cambiar de día.
      </Typography>
      {result != null && (
        <Alert severity="success" sx={{ mb: 2 }}>{result} personas quedaron sin ubicación en el layout.</Alert>
      )}
      <Button
        variant="outlined"
        color="warning"
        startIcon={<LayersClearIcon fontSize="small" />}
        onClick={() => setConfirmOpen(true)}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        Vaciar layout ahora
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Vaciar layout de áreas de trabajo</DialogTitle>
        <DialogContent>
          <Typography>
            Todo el personal ubicado hoy por el snapshot histórico quedará sin área en el mapa visual, de forma
            permanente hasta que alguien lo reasigne. Esto no afecta el módulo de Personal ni la búsqueda. ¿Confirmas?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="warning" variant="contained" onClick={handleConfirm}>Vaciar layout</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
