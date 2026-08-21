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
  try { data = await res.json() } catch { /* respuesta sin body */ }
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
  // Que modulos puede ver el rol de este usuario -- configurable por un
  // ADMINISTRADOR (ver UsuariosPage). null mientras carga o si no hay sesion;
  // Sidebar/rutas deben esperar a que esto deje de ser null antes de decidir
  // "no tiene acceso", para no expulsar a nadie por un parpadeo de carga.
  const [rolePermissions, setRolePermissions] = useState(null)
  const [rolePermissionsLoading, setRolePermissionsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest('/api/auth/session')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshRolePermissions = useCallback(async () => {
    try {
      const data = await apiRequest('/api/role-permissions')
      setRolePermissions(data.rolePermissions)
    } catch {
      setRolePermissions(null)
    } finally {
      setRolePermissionsLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    // Mientras la sesion (loading) todavia no resuelve, "user" esta en null
    // de forma TRANSITORIA -- no es lo mismo que "confirmado sin sesion".
    // Marcar rolePermissionsLoading=false aqui seria prematuro: dejaria a
    // useModulesForCurrentRole devolver modules:[] antes de saber quien es
    // el usuario real, lo que hace que RequireModuleAccess/DefaultRedirect
    // redirijan a /login por error incluso con una sesion valida (bug real
    // detectado 2026-08-21: recarga directa a /dashboard o /centro-trabajo
    // se quedaba en blanco por este rebote).
    if (loading) return
    if (!user) { setRolePermissionsLoading(false); return }
    refreshRolePermissions()
  }, [user, loading, refreshRolePermissions])

  const login = useCallback(async (identifier, password) => {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: { identifier, password } })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try { await apiRequest('/api/auth/logout', { method: 'POST' }) } catch { /* ignore */ }
    setUser(null)
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await apiRequest('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })
    setUser(data.user)
    return data.user
  }, [])

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, changePassword, refresh,
      rolePermissions, rolePermissionsLoading, refreshRolePermissions,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/* Modulos permitidos para EL ROL ACTUAL -- null mientras carga (Sidebar/rutas
   deben tratar null como "todavia no se sabe", nunca como "sin acceso"). */
export function useModulesForCurrentRole() {
  const { user, rolePermissions, rolePermissionsLoading } = useAuth()
  if (rolePermissionsLoading) return { modules: null, loading: true }
  if (!user || !rolePermissions) return { modules: [], loading: false }
  return { modules: rolePermissions[user.role] || [], loading: false }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
