import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import GridViewIcon from '@mui/icons-material/GridView'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import MenuIcon from '@mui/icons-material/Menu'
import { usePageStyles } from '../../ui/pageStyles'
import RotateDeviceHint from '../../ui/RotateDeviceHint'
import HeaderUserActions from '../../layout/HeaderUserActions'
import AreasLayoutView from './AreasLayoutView'
import LineasTab from './LineasTab'
import EstacionesTab from './EstacionesTab'
import PersonalDeHoyTab from './PersonalDeHoyTab'
import BajasTab from './BajasTab'
import AreaDetail from './AreaDetail'
import { useSelectedWorkCenter } from './useSelectedWorkCenter'

const TABS = [
  { key: 'areas', label: 'Áreas de trabajo' },
  { key: 'lineas', label: 'Líneas' },
  { key: 'estaciones', label: 'Estaciones' },
  { key: 'personal', label: 'Personal' },
  { key: 'bajas', label: 'Bajas' },
]

/* Centro de Trabajo = OPERACION. Sin KPIs ejecutivos, sin produccion,
   sin tendencias, sin alertas — eso vive en Dashboard. Aqui solo se
   administra/consulta el entorno: areas, lineas, estaciones y
   personal, con datos reales (snapshot de BASE + asignacion diaria
   real cuando exista). */
export default function CentroTrabajoPage() {
  const ps = usePageStyles()
  const [tab, setTab] = useState('areas')
  const { workCenterId: selectedLine, openWorkCenter: setSelectedLine, closeWorkCenter } = useSelectedWorkCenter()
  /* 2026-08-27 ("rediseño del header de Centro de Trabajo", a peticion
     explicita del usuario): mode/setMode + apertura del sidebar movil
     vienen de AppLayout.jsx via <Outlet context={...}> -- esta pagina es
     la UNICA que oculta la barra superior global y construye su propio
     header (logo+titulo+subtitulo+acciones+tabs, todo en la misma card),
     reutilizando exactamente el mismo estado/handlers que ya vivian en
     AppLayout (nunca duplicados, ver HeaderUserActions.jsx). */
  const { mode, setMode, onOpenMobileSidebar, showMobileMenuButton } = useOutletContext()

  return (
    <Box sx={ps.page}>
      <Paper elevation={0} sx={{ ...ps.card, mb: 2, borderRadius: '20px' }}>
        <Box sx={{
          px: { xs: 1.75, md: 3 }, py: { xs: 1.5, md: 2 },
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        }}>
          {showMobileMenuButton && (
            <IconButton size="small" onClick={onOpenMobileSidebar} sx={{ flexShrink: 0 }}>
              <MenuIcon fontSize="small" />
            </IconButton>
          )}

          {/* Logo + titulo: mismo simbolo/color que antes vivian en la barra
              superior global (PrecisionManufacturingIcon, #3B82F6), un poco
              mas grande aqui para darle identidad al nuevo header
              principal. Hover sutil (seccion "EFECTO DEL LOGO + TITULO" del
              pedido) -- puramente decorativo, sin navegacion asociada. */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 0.5, borderRadius: 2.5,
            transition: 'background-color 200ms ease',
            '&:hover': {
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59,130,246,.10)' : 'rgba(59,130,246,.06)'),
              '& .ct-header-icon': { transform: 'scale(1.05)', filter: 'drop-shadow(0 0 6px rgba(59,130,246,.45))' },
              '& .ct-header-title': { color: '#3B82F6' },
            },
          }}>
            <PrecisionManufacturingIcon
              className="ct-header-icon"
              sx={{ color: '#3B82F6', fontSize: 30, transition: 'transform 200ms ease, filter 200ms ease', flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography className="ct-header-title" sx={{ ...ps.pageTitle, fontSize: { xs: '1.15rem', sm: '1.4rem' }, transition: 'color 200ms ease' }}>
                Centro de Trabajo
              </Typography>
              <Typography sx={ps.pageSubtitle}>Organización operativa por áreas, líneas, estaciones y personal</Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 16 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <HeaderUserActions mode={mode} setMode={setMode} />
            {/* Acceso directo al layout/plano (Áreas de trabajo) desde
                cualquier pestaña -- a peticion explicita del usuario
                (2026-08-24, mockup de la pestaña Lineas). Misma ruta/handler
                de siempre (setTab('areas')), solo se le agrega hover. */}
            <Button
              variant="outlined" size="small" startIcon={<GridViewIcon sx={{ fontSize: 17 }} />}
              onClick={() => setTab('areas')}
              sx={{
                textTransform: 'none', fontWeight: 700, flexShrink: 0, ml: 1, borderRadius: 2.5,
                transition: 'background-color 200ms ease, border-color 200ms ease, transform 200ms ease',
                '&:hover': {
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59,130,246,.14)' : 'rgba(59,130,246,.06)'),
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Ver layout general
            </Button>
          </Box>
        </Box>

        <Box sx={{ px: { xs: 1, md: 2 }, borderTop: '1px solid', borderColor: 'divider' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 46,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 13.5, minHeight: 46 },
            }}
          >
            {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} />)}
          </Tabs>
        </Box>
      </Paper>

      {tab === 'areas' && (
        <>
          {/* Solo aqui: el mapa de areas (WorkAreaMap) esta pensado para
              pantallas anchas (10 lineas + zonas lado a lado); las demas
              tabs (Lineas/Estaciones/Personal) son listas/tablas que
              funcionan bien en portrait, no necesitan el aviso. */}
          <RotateDeviceHint />
          <AreasLayoutView onOpenLine={setSelectedLine} />
        </>
      )}
      {tab === 'lineas' && <LineasTab onOpenLine={setSelectedLine} />}
      {tab === 'estaciones' && <EstacionesTab onOpenLine={setSelectedLine} onGoToLineas={() => setTab('lineas')} />}
      {tab === 'personal' && <PersonalDeHoyTab onGoToBajas={() => setTab('bajas')} onGoToAreas={() => setTab('areas')} />}
      {tab === 'bajas' && <BajasTab />}

      <AreaDetail workCenterId={selectedLine} open={Boolean(selectedLine)} onClose={closeWorkCenter} onNavigate={setSelectedLine} />
    </Box>
  )
}
