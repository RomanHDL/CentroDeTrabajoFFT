import { useMemo, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import ThemeProvider from '@mui/material/styles/ThemeProvider'
import CssBaseline from '@mui/material/CssBaseline'
import { buildTheme } from './ui/theme'
import { AuthProvider } from './state/auth'
import { RoleModeProvider } from './state/roleMode'
import { DndAssignProvider } from './state/dndAssign'
import ProtectedRoute from './routing/ProtectedRoute'
import RequireModuleAccess from './routing/RequireModuleAccess'
import DefaultRedirect from './routing/DefaultRedirect'
import AppLayout from './layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import CentroTrabajoPage from './pages/centro-trabajo/CentroTrabajoPage'
import RegistroPersonalPage from './pages/registro-personal/RegistroPersonalPage'
import UsuariosPage from './pages/usuarios/UsuariosPage'
import KpisPage from './pages/kpis/KpisPage'
import AsistenciaPage from './pages/asistencia/AsistenciaPage'
import AuditoriaPage from './pages/auditoria/AuditoriaPage'
import ToastHost from './ui/ToastHost'

export default function App() {
  const [mode, setMode] = useState('light')
  const theme = useMemo(() => buildTheme(mode), [mode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RoleModeProvider>
          <DndAssignProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout mode={mode} setMode={setMode} />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DefaultRedirect />} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireModuleAccess>
                      <DashboardPage />
                    </RequireModuleAccess>
                  }
                />
                <Route
                  path="/centro-trabajo"
                  element={
                    <RequireModuleAccess>
                      <CentroTrabajoPage />
                    </RequireModuleAccess>
                  }
                />
                <Route
                  path="/registro-personal"
                  element={
                    <RequireModuleAccess>
                      <RegistroPersonalPage />
                    </RequireModuleAccess>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <RequireModuleAccess>
                      <UsuariosPage />
                    </RequireModuleAccess>
                  }
                />
                <Route
                  path="/kpis"
                  element={
                    <RequireModuleAccess>
                      <KpisPage />
                    </RequireModuleAccess>
                  }
                />
                <Route
                  path="/asistencia"
                  element={
                    <RequireModuleAccess>
                      <AsistenciaPage />
                    </RequireModuleAccess>
                  }
                />
                <Route
                  path="/auditoria"
                  element={
                    <RequireModuleAccess>
                      <AuditoriaPage />
                    </RequireModuleAccess>
                  }
                />
              </Route>

              {/* Fuera del AppLayout (sin sidebar) pero igual protegida: se usa antes de que el
                  usuario pueda ver el resto del sistema cuando mustChangePassword = true. */}
              <Route
                path="/cambiar-contrasena"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <ToastHost />
          </DndAssignProvider>
        </RoleModeProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
