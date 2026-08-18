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

  useEffect(() => { refresh() }, [refresh])

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
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
