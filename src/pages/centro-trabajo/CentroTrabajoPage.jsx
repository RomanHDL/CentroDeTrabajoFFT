import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Button from '@mui/material/Button'
import GridViewIcon from '@mui/icons-material/GridView'
import { usePageStyles } from '../../ui/pageStyles'
import RotateDeviceHint from '../../ui/RotateDeviceHint'
import AreasLayoutView from './AreasLayoutView'
import LineasTab from './LineasTab'
import EstacionesTab from './EstacionesTab'
import PersonalDeHoyTab from './PersonalDeHoyTab'
import BajasTab from './BajasTab'
import LineDetailDrawer from './LineDetailDrawer'

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
  const [selectedLine, setSelectedLine] = useState(null)

  return (
    <Box sx={ps.page}>
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={ps.pageTitle}>Centro de Trabajo</Typography>
            <Typography sx={ps.pageSubtitle}>Organización operativa por áreas, líneas, estaciones y personal</Typography>
          </Box>
          {/* Acceso directo al layout/plano (Áreas de trabajo) desde
              cualquier pestaña -- a peticion explicita del usuario
              (2026-08-24, mockup de la pestaña Lineas). */}
          <Button
            variant="outlined" size="small" startIcon={<GridViewIcon sx={{ fontSize: 17 }} />}
            onClick={() => setTab('areas')}
            sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
          >
            Ver layout general
          </Button>
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
      {tab === 'personal' && <PersonalDeHoyTab />}
      {tab === 'bajas' && <BajasTab />}

      <LineDetailDrawer workCenterId={selectedLine} open={Boolean(selectedLine)} onClose={() => setSelectedLine(null)} />
    </Box>
  )
}
