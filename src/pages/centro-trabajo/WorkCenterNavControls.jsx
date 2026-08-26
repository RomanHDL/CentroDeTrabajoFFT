import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { alpha } from '@mui/material/styles'

/* ─────────────────────────────────────────────
   Anterior / Siguiente entre Work Centers -- 2026-08-27, a peticion
   explicita del usuario. Componente UNICO reutilizado tal cual en los
   3 headers de detalle (LineDetailDrawer/OperationalAreaDetail/
   SupportAreaDetail) -- nunca una copia de esta UI por archivo.

   `previous`/`next` son objetos WORK_CENTERS (o null en el primer/
   ultimo elemento -- ver getWorkCenterNavContext, catalog.js) --
   siempre lineal, nunca circular (null deshabilita el boton en vez de
   dar la vuelta). `onNavigate(id)` lo decide quien renderiza esto
   (AreaDetail.jsx), nunca logica de navegacion propia aqui.

   Responsive (Parte 5/28 del pedido): en pantallas angostas (tablet
   chica) el boton muestra "Anterior"/"Siguiente" genericos (nunca se
   desborda ni corta el nombre real a la mitad); el nombre real siempre
   esta disponible via Tooltip, y aparece completo en el boton desde
   sm hacia arriba. Atajo de teclado opcional (Alt+Flecha) -- nunca
   intercepta flechas mientras se esta escribiendo en un input/textarea. */
export default function WorkCenterNavControls({ previous, next, onNavigate }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (!e.altKey || e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      if (e.key === 'ArrowLeft' && previous) { e.preventDefault(); onNavigate(previous.id) }
      if (e.key === 'ArrowRight' && next) { e.preventDefault(); onNavigate(next.id) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previous, next, onNavigate])

  const btnSx = {
    textTransform: 'none', fontWeight: 700, fontSize: 12.5, borderRadius: 2,
    border: '1px solid', borderColor: 'divider', color: 'text.primary',
    bgcolor: 'background.paper', px: 1.1, py: 0.5, minWidth: 0, lineHeight: 1.3,
    '&:hover': { borderColor: '#3B82F6', bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.14 : 0.06) },
    '&.Mui-disabled': { opacity: 0.35, borderColor: 'divider' },
  }

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
      <Tooltip title={previous ? previous.name : 'No hay área anterior'}>
        <span>
          <Button
            size="small" disabled={!previous} onClick={() => previous && onNavigate(previous.id)}
            startIcon={<ChevronLeftIcon sx={{ fontSize: 17 }} />} sx={btnSx}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{previous?.name || 'Anterior'}</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Anterior</Box>
          </Button>
        </span>
      </Tooltip>
      <Tooltip title={next ? next.name : 'No hay área siguiente'}>
        <span>
          <Button
            size="small" disabled={!next} onClick={() => next && onNavigate(next.id)}
            endIcon={<ChevronRightIcon sx={{ fontSize: 17 }} />} sx={btnSx}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{next?.name || 'Siguiente'}</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Siguiente</Box>
          </Button>
        </span>
      </Tooltip>
    </Stack>
  )
}
