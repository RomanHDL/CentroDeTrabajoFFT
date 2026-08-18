import { useMemo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import CssBaseline from '@mui/material/CssBaseline'
import { buildTheme } from './ui/theme'
import { AuthProvider } from './state/auth'
import { RoleModeProvider } from './state/roleMode'
import ProtectedRoute from './routing/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import CentroTrabajoPage from './pages/centro-trabajo/CentroTrabajoPage'
import UsuariosPage from './pages/usuarios/UsuariosPage'

export default function App() {
  const [mode, setMode] = useState('light')
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RoleModeProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute><AppLayout mode={mode} setMode={setMode} /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/centro-trabajo" element={<CentroTrabajoPage />} />
              <Route
                path="/usuarios"
                element={<ProtectedRoute roles={['ADMINISTRADOR']}><UsuariosPage /></ProtectedRoute>}
              />
            </Route>

            {/* Fuera del AppLayout (sin sidebar) pero igual protegida: se usa antes de que el
                usuario pueda ver el resto del sistema cuando mustChangePassword = true. */}
            <Route path="/cambiar-contrasena" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
          </Routes>
        </RoleModeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
