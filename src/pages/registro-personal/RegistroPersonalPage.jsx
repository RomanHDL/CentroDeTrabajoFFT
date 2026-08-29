import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { usePageStyles } from '../../ui/pageStyles'
import RegisterPersonnelForm from '../centro-trabajo/RegisterPersonnelForm'

/* Modulo propio, separado de Centro de Trabajo, cuyo unico contenido
   es la tarjeta de registro de personal (a peticion del usuario,
   2026-08-20) — misma logica que el dialogo de la pestaña "Personal"
   (RegisterPersonnelForm centraliza todo, para no tener dos copias
   de la validacion que se puedan desincronizar). */
export default function RegistroPersonalPage() {
  const ps = usePageStyles()
  // Aqui no hay dialogo que cerrar: "Cancelar" limpia el formulario.
  // Forzar un remount (key) es mas simple y seguro que exponer un
  // metodo reset() desde RegisterPersonnelForm.
  const [resetKey, setResetKey] = useState(0)

  return (
    <Box sx={ps.page}>
      <Paper elevation={0} sx={{ ...ps.card, maxWidth: 480, mx: 'auto' }}>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 2 }}>
            + Registrar personal
          </Typography>
          <RegisterPersonnelForm
            key={resetKey}
            cancelLabel="Cancelar"
            onCancel={() => setResetKey((k) => k + 1)}
          />
        </Box>
      </Paper>
    </Box>
  )
}
