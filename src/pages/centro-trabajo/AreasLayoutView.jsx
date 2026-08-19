import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import { usePageStyles } from '../../ui/pageStyles'
import { BASE_SNAPSHOT_DATE, getPeopleWithoutArea } from '../../data/production/personnelByArea'
import { PHYSICAL_ZONES } from '../../data/production/layoutZones'
import WorkAreaMap, { describeZoneSelection } from '../../components/WorkAreaMap'
import AreaDetailPanel from './AreaDetailPanel'
import AreaSummaryStrip from './AreaSummaryStrip'

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
  const [selection, setSelection] = useState(null)
  const [showSinZona, setShowSinZona] = useState(false)
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
        Snapshot real de personal desde LAYOUT FFT.xlsx (hoja BASE) — {BASE_SNAPSHOT_DATE}. Números de empleado
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
          <WorkAreaMap selection={selection} onSelect={setSelection} size="lg" showLegend />
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

      <AreaSummaryStrip onSelectArea={handleSelectArea} />

      {sinZona.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2.5, p: 1.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(148,163,184,.06)' : 'rgba(148,163,184,.08)'),
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontWeight: 800, fontSize: 12.5 }}>
              Personal sin área asignada ({sinZona.length})
            </Typography>
            <Button size="small" onClick={() => setShowSinZona((v) => !v)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              {showSinZona ? 'Ocultar' : 'Ver lista'}
            </Button>
          </Stack>
          {showSinZona && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.25 }}>
              {sinZona.map((p) => (
                <Chip key={p.id} size="small" label={p.asistencia ? `${p.name} (${p.asistencia})` : p.name} />
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}
