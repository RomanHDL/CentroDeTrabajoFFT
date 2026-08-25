import { useEffect, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Checkbox from '@mui/material/Checkbox'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import { apiRequest } from '../../../state/auth'
import { ROLE_LABELS } from '../../../layout/roleLabels'
import { showToast } from '../../../ui/toast'
import { getModuleIcon } from './moduleIcons'

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

/* Matriz MODULOS x ROL -- reemplaza a RoleModulePermissionsPanel.jsx
   (2026-08-25, rediseño del modulo Usuarios). La lista de modulos ya no esta
   hardcodeada aqui: viene de /api/modules (MODULE_REGISTRY, shared/moduleRegistry.js),
   filtrando los reservados (Usuarios/Layout 2D nunca se gestionan por rol).
   Cada toggle es OPTIMISTA: cambia la UI de inmediato, y si el PATCH falla
   revierte el checkbox y muestra un toast de error -- nunca deja la UI
   diciendo que guardo cuando el backend fallo. */
export default function RoleModulePermissionsCard() {
  const [modules, setModules] = useState([])
  const [permissions, setPermissions] = useState(null) // { [role]: { [moduleKey]: boolean } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState(null)
  const [usersDialog, setUsersDialog] = useState(null) // { module, users, loading }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [modulesData, permsData] = await Promise.all([
        apiRequest('/api/modules'),
        apiRequest('/api/role-permissions'),
      ])
      const protectedModules = modulesData.modules.filter((m) => m.permissionProtected && !m.systemReserved)
      setModules(protectedModules)

      const map = {}
      ROLES.forEach((role) => { map[role] = {} })
      Object.entries(permsData.rolePermissions || {}).forEach(([role, keys]) => {
        if (!map[role]) map[role] = {}
        keys.forEach((key) => { map[role][key] = true })
      })
      setPermissions(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggle(role, moduleKey, checked) {
    const savingId = `${role}:${moduleKey}`
    const previous = permissions
    setPermissions((prev) => ({ ...prev, [role]: { ...prev[role], [moduleKey]: checked } }))
    setSavingKey(savingId)
    try {
      const data = await apiRequest(`/api/role-permissions/${role}`, { method: 'PATCH', body: { moduleKey, allowed: checked } })
      setPermissions((prev) => ({ ...prev, [role]: data.modules }))
      showToast('Permiso actualizado', 'success')
    } catch (err) {
      setPermissions(previous)
      showToast(err.message || 'No se pudo actualizar el permiso', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  async function openUsersDialog(module) {
    setUsersDialog({ module, users: [], loading: true })
    try {
      const data = await apiRequest(`/api/permissions/modules/${encodeURIComponent(module.key)}/users`)
      setUsersDialog({ module, users: data.users, loading: false })
    } catch (err) {
      setUsersDialog({ module, users: [], loading: false, error: err.message })
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell>Módulos del sistema</TableCell>
              {ROLES.map((role) => <TableCell key={role} align="center">{ROLE_LABELS[role]}</TableCell>)}
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map((m) => {
              const Icon = getModuleIcon(m.icon)
              return (
                <TableRow key={m.key} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{m.description}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  {ROLES.map((role) => {
                    const isAdmin = role === 'ADMINISTRADOR'
                    const checked = isAdmin || !!permissions?.[role]?.[m.key]
                    const savingId = `${role}:${m.key}`
                    const checkbox = (
                      <Checkbox
                        size="small"
                        checked={checked}
                        disabled={isAdmin}
                        onChange={(e) => toggle(role, m.key, e.target.checked)}
                      />
                    )
                    return (
                      <TableCell key={role} align="center">
                        {savingKey === savingId ? (
                          <CircularProgress size={16} />
                        ) : isAdmin ? (
                          <Tooltip title="El rol Administrador tiene acceso completo.">
                            <span>{checkbox}</span>
                          </Tooltip>
                        ) : checkbox}
                      </TableCell>
                    )
                  })}
                  <TableCell align="right">
                    <Button size="small" onClick={() => openUsersDialog(m)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                      Usuarios con acceso
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={!!usersDialog} onClose={() => setUsersDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {usersDialog?.module ? `Usuarios con acceso a ${usersDialog.module.name}` : ''}
        </DialogTitle>
        <DialogContent>
          {usersDialog?.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
          ) : usersDialog?.error ? (
            <Alert severity="error">{usersDialog.error}</Alert>
          ) : usersDialog?.users.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>Nadie tiene acceso a este módulo actualmente.</Typography>
          ) : (
            <List dense>
              {usersDialog?.users.map((u) => (
                <ListItem key={u.id} disableGutters>
                  <ListItemText
                    primary={u.name}
                    secondary={`${ROLE_LABELS[u.role] || u.role}${u.employeeNumber ? ` · ${u.employeeNumber}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
