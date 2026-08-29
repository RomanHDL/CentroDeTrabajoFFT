import { useEffect, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { subscribeToast } from './toast'

/* Monta UNA sola vez cerca de la raiz de la app (App.jsx). Muestra
   los toasts de showToast() uno a la vez, en orden — patron oficial
   de MUI para colas de Snackbar (avanzar en onExited, no en un
   efecto reactivo simple, para no perder mensajes que llegan casi
   al mismo tiempo, p. ej. "asignado" + advertencia de plantilla). */
export default function ToastHost() {
  const [queue, setQueue] = useState([])
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(null)

  useEffect(() => subscribeToast((toast) => setQueue((q) => [...q, toast])), [])

  useEffect(() => {
    if (queue.length && !current) {
      setCurrent(queue[0])
      setQueue((q) => q.slice(1))
      setOpen(true)
    } else if (queue.length && current && open) {
      setOpen(false)
    }
  }, [queue, current, open])

  function handleClose(_e, reason) {
    if (reason === 'clickaway') return
    setOpen(false)
  }

  return (
    <Snackbar
      key={current?.id}
      open={open}
      autoHideDuration={3200}
      onClose={handleClose}
      TransitionProps={{ onExited: () => setCurrent(null) }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      {current ? (
        <Alert
          severity={current.severity}
          variant="filled"
          onClose={handleClose}
          sx={{ fontWeight: 600 }}
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
