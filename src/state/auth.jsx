import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export async function apiRequest(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    /* respuesta sin body */
  }
  if (!res.ok) {
    const error = new Error(data?.error || `Error ${res.status}`)
    error.status = res.status
    throw error
  }
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Modulos con acceso EFECTIVO para el usuario actual (rol + override
  // individual, ya resueltos en el servidor -- ver
  // server-lib/permissionService.ts getEffectiveModulesForUser). Llegan
  // junto con /api/auth/session y /api/auth/login, como propiedad hermana de
  // "user" -- el JWT sigue siendo solo { sub: userId }, asi que un cambio de
  // permiso aplica en el siguiente refresh de sesion sin requerir login
  // nuevo. null mientras carga o si no hay sesion; Sidebar/rutas deben
  // esperar a que esto deje de ser null antes de decidir "no tiene acceso",
  // para no expulsar a nadie por un parpadeo de carga.
  const [effectiveModules, setEffectiveModules] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest('/api/auth/session')
      setUser(data.user)
      setEffectiveModules(data.effectiveModules ?? [])
    } catch {
      setUser(null)
      setEffectiveModules(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (identifier, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { identifier, password },
    })
    setUser(data.user)
    setEffectiveModules(data.effectiveModules ?? [])
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
    } catch {
      /* ignore */
    }
    setUser(null)
    setEffectiveModules(null)
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    })
    setUser(data.user)
    return data.user
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        changePassword,
        refresh,
        effectiveModules,
        effectiveModulesLoading: loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* Modulos con acceso EFECTIVO para el usuario actual (rol + override
   individual, ya resueltos en el servidor) -- null mientras carga
   (Sidebar/rutas deben tratar null como "todavia no se sabe", nunca como
   "sin acceso"). */
export function useEffectiveModules() {
  const { loading, effectiveModules } = useAuth()
  if (loading) return { modules: null, loading: true }
  return { modules: effectiveModules ?? [], loading: false }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
