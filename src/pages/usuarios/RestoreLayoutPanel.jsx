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
import RestoreIcon from '@mui/icons-material/Restore'
import { getSuppressedLinePeopleIds } from '../../data/production/personnelByArea'
import { restoreBaselinePlacement } from '../../data/personnel/repository'
import { showToast } from '../../ui/toast'

/* Inverso exacto de "Vaciar layout" (ClearLayoutPanel.jsx), a peticion
   explicita del usuario (2026-08-24): regresa al mapa visual, por su
   zona historica de BASE/LAYOUT FFT.xlsx, a quien quedo sin area por el
   boton "Vaciar layout" — sin inventar un puesto/estacion especifico
   dentro de la linea (el Excel no dice quien hace que puesto), igual
   que ya se ve hoy en Paletizado/Accesorios/Midea-High Value. Mismo
   alcance que "Vaciar layout": solo CT LINEA (LINEA1-10 + CT LINEA 0/
   Proyecto) y "PRODUCCION" generico — nunca toca a quien ya tiene una
   asignacion real de hoy (esas siempre ganan sobre el snapshot). */
export default function RestoreLayoutPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState(null)

  function handleConfirm() {
    setConfirmOpen(false)
    const ids = getSuppressedLinePeopleIds()
    if (ids.length === 0) {
      showToast('No hay nadie suprimido en las CT LINEA ahorita — no hace falta restaurar nada.', 'info')
      return
    }
    restoreBaselinePlacement(ids)
    setResult(ids.length)
    showToast(`Layout restaurado: ${ids.length} personas volvieron a su área de las CT LINEA.`, 'success')
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mt: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 0.5 }}>Restaurar layout de las CT LINEA</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Regresa, en el mapa visual, a todo el personal que quedó sin área por "Vaciar layout" a su línea histórica
        de LAYOUT FFT.xlsx (sin puesto/estación inventado dentro de la línea — el Excel no dice quién hace qué
        puesto). Nunca toca a quien ya tiene una asignación real de hoy hecha desde Registro de personal.
      </Typography>
      {result != null && (
        <Alert severity="success" sx={{ mb: 2 }}>{result} personas volvieron a aparecer en su CT LINEA.</Alert>
      )}
      <Button
        variant="outlined"
        color="success"
        startIcon={<RestoreIcon fontSize="small" />}
        onClick={() => setConfirmOpen(true)}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        Restaurar layout ahora
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Restaurar layout de las CT LINEA</DialogTitle>
        <DialogContent>
          <Typography>
            Todo el personal suprimido de las CT LINEA volverá a ubicarse por su zona histórica de LAYOUT FFT.xlsx,
            sin puesto específico asignado (queda como "—" hasta que un líder lo registre de verdad). No afecta a
            quien ya tiene una asignación real hecha hoy. ¿Confirmas?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button color="success" variant="contained" onClick={handleConfirm}>Restaurar layout</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
