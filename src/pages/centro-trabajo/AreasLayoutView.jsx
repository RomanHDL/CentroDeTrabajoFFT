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
import { describeZoneSelection } from '../../components/WorkAreaMap'
import OperatingFloorPlan from '../../components/OperatingFloorPlan'
import AreaDetailPanel from './AreaDetailPanel'
import WorkAreaBottomSummary from './WorkAreaBottomSummary'

/* ─────────────────────────────────────────────
   "Areas de trabajo" (2026-08-25, a peticion explicita del usuario):
   el layout ya NO es WorkAreaMap (el mockup anterior) sino el MISMO
   plano grande que ya se usaba en /layout-2d -- OperatingFloorPlan,
   el componente compartido -- para que Centro de Trabajo, Layout 2D
   y (antes) Dashboard nunca muestren dos disenos distintos del mismo
   piso. No-readOnly: click/drag&drop/asignar siguen funcionando
   exactamente igual que antes con WorkAreaMap. WorkAreaMap.jsx sigue
   existiendo solo por su helper describeZoneSelection (usado abajo
   para el caso especial "FFT" que dispara AreaCoverageSummaryCard),
   ya no se renderiza en ningun lado.

   El panel de detalle (AreaDetailPanel + Drawer lateral/inferior)
   sigue existiendo tal cual, pero ahora solo lo abre un click en
   "Resumen por área" (WorkAreaBottomSummary) -- un click directo
   sobre el plano abre el propio drawer/dialog de OperatingFloorPlan
   (igual que en Layout 2D), no este panel.
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

  const panel = (
    <AreaDetailPanel
      selection={selection}
      onSelectArea={handleSelectArea}
      onOpenFullDrawer={onOpenLine}
    />
  )

  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5 }}>
        Punto de partida: snapshot real desde LAYOUT FFT.xlsx (hoja BASE) — {BASE_SNAPSHOT_DATE}.
        Arrastrar o asignar a alguien actualiza su ubicación de hoy sin modificar ese snapshot.
        Números de empleado pendientes: BASE no trae esa columna todavía.
      </Typography>

      {/* Sin cardHeader propio (2026-08-25): OperatingFloorPlan ya trae su
          propio titulo "Área operando" + leyenda arriba, tener los dos
          duplicaria el encabezado. */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <OperatingFloorPlan />
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Detalle del área</Typography>
          <IconButton onClick={() => setSelection(null)}>
            <CloseIcon />
          </IconButton>
        </Box>
        {panel}
      </Drawer>

      {/* Rediseño 2026-08-25 (a peticion explicita del usuario) -- ver
          WorkAreaBottomSummary.jsx. */}
      <WorkAreaBottomSummary onSelectArea={handleSelectArea} sinZona={sinZona} />
    </Box>
  )
}
