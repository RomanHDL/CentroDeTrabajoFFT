import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { usePageStyles } from '../../ui/pageStyles'
import { BASE_SNAPSHOT_DATE, getPeopleWithoutArea } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { PHYSICAL_ZONES } from '../../data/production/layoutZones'
import WorkAreaMap, { describeZoneSelection } from '../../components/WorkAreaMap'
import AreaDetailPanel from './AreaDetailPanel'
import WorkAreaBottomSummary from './WorkAreaBottomSummary'

/* ─────────────────────────────────────────────
   "Areas de trabajo" — antes era una cuadricula de cajas con
   listas de nombres; ahora su elemento principal es el layout
   operativo del piso (WorkAreaMap), con un panel de detalle a la
   derecha (desktop/tablet) o en un Drawer inferior (movil). Reusa
   los mismos datos reales que ya alimentaban la vista anterior
   (personnelByArea.js) — nada nuevo se inventa aqui.
   ───────────────────────────────────────────── */
export default function AreasLayoutView({ onOpenLine }) {
  const ps = usePageStyles()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  usePersonnelVersion()
  const [selection, setSelection] = useState(null)
  const sinZona = getPeopleWithoutArea()

  function handleSelectArea(id) {
    if (id === 'FFT' || id === '__FFT__') {
      setSelection(describeZoneSelection(PHYSICAL_ZONES.FFT))
      return
    }
    setSelection({ type: 'area', id })
  }

  const panel = <AreaDetailPanel selection={selection} onSelectArea={handleSelectArea} onOpenFullDrawer={onOpenLine} />

  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5 }}>
        Punto de partida: snapshot real desde LAYOUT FFT.xlsx (hoja BASE) — {BASE_SNAPSHOT_DATE}. Arrastrar o
        asignar a alguien actualiza su ubicación de hoy sin modificar ese snapshot. Números de empleado
        pendientes: BASE no trae esa columna todavía.
      </Typography>

      <Paper elevation={0} sx={ps.card}>
        <Box sx={ps.cardHeader}>
          <Box>
            <Typography sx={ps.cardHeaderTitle}>Layout operativo del área</Typography>
            <Typography sx={ps.cardHeaderSubtitle}>
              Vista del centro de trabajo basada en el layout real — haz click en una zona para ver detalles
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          <WorkAreaMap selection={selection} onSelect={setSelection} />
        </Box>
      </Paper>

      {/* Ventana flotante con el detalle — mismo patron en desktop/tablet
          (Drawer lateral derecho) y movil (Drawer inferior), para que
          click en cualquier zona/area siempre abra algo visible al
          instante, sin depender de una columna fija en pantalla. */}
      <Drawer
        anchor={isDesktop ? 'right' : 'bottom'}
        open={!!selection}
        onClose={() => setSelection(null)}
        PaperProps={{
          sx: isDesktop
            ? { width: 420 }
            : { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh' },
        }}
      >
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          p: 1.5, borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Detalle del área</Typography>
          <IconButton onClick={() => setSelection(null)}><CloseIcon /></IconButton>
        </Box>
        {panel}
      </Drawer>

      {/* A partir de aqui: rediseño 2026-08-25 (a peticion explicita del
          usuario) -- ver WorkAreaBottomSummary.jsx. Todo lo de ARRIBA
          (titulo, subtitulo, card "Layout operativo del área" con
          WorkAreaMap, y el Drawer de detalle) queda 100% intacto. */}
      <WorkAreaBottomSummary onSelectArea={handleSelectArea} sinZona={sinZona} />
    </Box>
  )
}
