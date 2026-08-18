import React, { createContext, useContext, useState } from 'react'

/* ─────────────────────────────────────────────
   Modo de operacion (Empleado / Supervisor) — NO es
   autenticacion real (el proyecto no tiene backend/login
   propio). Es un selector de UI honesto: distingue que
   acciones se ofrecen (autoasignarse vs asignar/mover a
   cualquiera) sin fingir seguridad que no existe. El dia que
   haya un sistema de permisos real, este selector se
   sustituye por el rol de la sesion autenticada.
   ───────────────────────────────────────────── */

const RoleModeContext = createContext(null)

const STORAGE_KEY = 'cp_role_mode'

function readInitialMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'EMPLEADO' ? 'EMPLEADO' : 'SUPERVISOR'
  } catch {
    return 'SUPERVISOR'
  }
}

export function RoleModeProvider({ children }) {
  const [mode, setModeState] = useState(readInitialMode)

  const setMode = (next) => {
    setModeState(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }

  return (
    <RoleModeContext.Provider value={{ mode, setMode, isSupervisor: mode === 'SUPERVISOR' }}>
      {children}
    </RoleModeContext.Provider>
  )
}

export function useRoleMode() {
  return useContext(RoleModeContext)
}
