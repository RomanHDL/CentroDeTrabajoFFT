import React, { useMemo, useState } from 'react'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { buildTheme } from './ui/theme'
import { RoleModeProvider, useRoleMode } from './state/roleMode'
import ControlProduccionPage from './pages/control-produccion/ControlProduccionPage'

function RoleModeSwitcher() {
  const { mode, setMode } = useRoleMode()
  return (
    <Tooltip title="Modo de operación — sin login todavía: solo cambia qué acciones se ofrecen en pantalla">
      <Select
        size="small"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        sx={{ height: 32, fontWeight: 700, fontSize: 12.5, '& .MuiSelect-select': { py: 0.5 } }}
      >
        <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
        <MenuItem value="EMPLEADO">Empleado</MenuItem>
      </Select>
    </Tooltip>
  )
}

export default function App() {
  const [mode, setMode] = useState('light')
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RoleModeProvider>
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
          <AppBar position="sticky" elevation={0} sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}>
            <Toolbar sx={{ gap: 1.25, minHeight: '56px !important', px: { xs: 1.5, md: 2.5 } }}>
              <PrecisionManufacturingIcon sx={{ color: '#3B82F6' }} />
              <Typography sx={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.2 }}>
                Control de Producción
              </Typography>
              <Box sx={{ flex: 1 }} />
              <RoleModeSwitcher />
              <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
                <IconButton size="small" onClick={() => setMode(m => m === 'light' ? 'dark' : 'light')}>
                  {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, py: { xs: 2, md: 2.5 }, maxWidth: 1600, mx: 'auto' }}>
            <ControlProduccionPage />
          </Box>
        </Box>
      </RoleModeProvider>
    </ThemeProvider>
  )
}
