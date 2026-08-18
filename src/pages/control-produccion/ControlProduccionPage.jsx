import React, { useState } from 'react'
import dayjs from 'dayjs'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import { usePageStyles } from '../../ui/pageStyles'
import { CURRENT_SHIFT } from '../../data/production/catalog'
import DashboardTab from './DashboardTab'
import ProduccionDiariaTab from './ProduccionDiariaTab'
import ProduccionSemanalTab from './ProduccionSemanalTab'
import PersonalDeHoyTab from './PersonalDeHoyTab'
import LineDetailDrawer from './LineDetailDrawer'
import ExportMenuButton from './ExportMenuButton'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'diaria', label: 'Producción diaria' },
  { key: 'semanal', label: 'Producción semanal' },
  { key: 'personal', label: 'Personal de hoy' },
]

export default function ControlProduccionPage() {
  const ps = usePageStyles()
  const [tab, setTab] = useState('dashboard')
  const [selectedLine, setSelectedLine] = useState(null)

  const today = dayjs()

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={{
          ...ps.cardHeader,
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 1.5,
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={ps.pageTitle}>Control de Producción</Typography>
            <Typography sx={ps.pageSubtitle}>Personal, líneas y producción en tiempo real</Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              icon={<WbSunnyIcon sx={{ fontSize: 16 }} />}
              label={`Turno: ${CURRENT_SHIFT}`}
              sx={{ ...ps.metricChip('info'), fontWeight: 700 }}
            />
            <Chip label={`Hoy: ${today.format('DD MMMM YYYY')}`} sx={ps.metricChip('default')} />
            <ExportMenuButton dateISO={today.format('YYYY-MM-DD')} />
          </Stack>
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
            {TABS.map(t => <Tab key={t.key} value={t.key} label={t.label} />)}
          </Tabs>
        </Box>
      </Paper>

      {/* Content */}
      {tab === 'dashboard' && <DashboardTab onOpenLine={setSelectedLine} />}
      {tab === 'diaria' && <ProduccionDiariaTab />}
      {tab === 'semanal' && <ProduccionSemanalTab />}
      {tab === 'personal' && <PersonalDeHoyTab />}

      <LineDetailDrawer workCenterId={selectedLine} open={Boolean(selectedLine)} onClose={() => setSelectedLine(null)} />
    </Box>
  )
}
