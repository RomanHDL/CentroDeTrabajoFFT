import React, { createContext, useContext } from 'react'
import { useAuth } from './auth'

/* ─────────────────────────────────────────────
   Modo de operacion (Empleado / Supervisor) — ahora derivado del ROL REAL de la sesion
   autenticada (User.role), como lo anticipaba este mismo archivo antes de que existiera
   login. ADMINISTRADOR/SUPERVISOR/LIDER son todos personal de sistema (nunca un Employee de
   piso autoasignandose), asi que los tres operan en modo "SUPERVISOR" para estos componentes.
   Ya no hay switcher de UI ni localStorage: el rol viene del backend, no se puede fingir.
   ───────────────────────────────────────────── */

const RoleModeContext = createContext(null)

export function RoleModeProvider({ children }) {
  const { user } = useAuth()
  const mode = user ? 'SUPERVISOR' : 'EMPLEADO'

  return (
    <RoleModeContext.Provider value={{ mode, isSupervisor: mode === 'SUPERVISOR' }}>
      {children}
    </RoleModeContext.Provider>
  )
}

export function useRoleMode() {
  return useContext(RoleModeContext)
}
