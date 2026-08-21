import { useEffect, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { apiRequest, useAuth } from '../../state/auth'
import { ROLE_LABELS } from '../../layout/roleLabels'

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']
const MODULES = [
  { key: '/dashboard', label: 'Dashboard' },
  { key: '/centro-trabajo', label: 'Centro de Trabajo' },
  { key: '/registro-personal', label: 'Registro de personal' },
]

/* Que modulo puede ver cada rol -- editable en vivo aqui por un ADMINISTRADOR
   (2026-08-21, a peticion explicita del usuario). "Usuarios" no aparece: se
   queda fijo en el codigo solo para ADMINISTRADOR (ver Sidebar.jsx), no es
   configurable desde ningun lado, para no poder abrir por accidente la
   gestion de cuentas/contrasenas a otro rol. ADMINISTRADOR siempre sale con
   los 3 checkboxes marcados y deshabilitados: no debe poder quitarse a si
   mismo el acceso y quedar bloqueado (el backend tambien lo valida). */
export default function RoleModulePermissionsPanel() {
  const { refreshRolePermissions } = useAuth()
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/api/role-permissions')
      setPermissions(data.rolePermissions)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(role, moduleKey, checked) {
    const current = permissions[role] || []
    const next = checked ? [...current, moduleKey] : current.filter((m) => m !== moduleKey)
    const savingId = `${role}:${moduleKey}`
    setSavingKey(savingId)
    setError('')
    try {
      const data = await apiRequest(`/api/role-permissions/${role}`, { method: 'PATCH', body: { modules: next } })
      setPermissions((prev) => ({ ...prev, [role]: data.modules }))
      // Otros componentes ya montados (Sidebar, guards de ruta) usan el mismo
      // permiso desde AuthProvider -- sin esto, quien lo edita no ve su propio
      // cambio reflejado hasta recargar la pagina.
      refreshRolePermissions()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mt: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 0.5 }}>Permisos de módulos por rol</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
        Qué módulos puede ver cada rol. "Usuarios" siempre es solo para Administrador y no se puede cambiar aquí.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Rol</TableCell>
              {MODULES.map((m) => <TableCell key={m.key} align="center">{m.label}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role}>
                <TableCell sx={{ fontWeight: 600 }}>{ROLE_LABELS[role] || role}</TableCell>
                {MODULES.map((m) => {
                  const isAdmin = role === 'ADMINISTRADOR'
                  const checked = isAdmin || (permissions?.[role] || []).includes(m.key)
                  const savingId = `${role}:${m.key}`
                  return (
                    <TableCell key={m.key} align="center">
                      {savingKey === savingId ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Checkbox
                          size="small"
                          checked={checked}
                          disabled={isAdmin}
                          onChange={(e) => toggle(role, m.key, e.target.checked)}
                        />
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  )
}
