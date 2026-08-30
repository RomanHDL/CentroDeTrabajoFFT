import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getRoleLabels } from '../../../layout/roleLabels'
import { apiRequest } from '../../../state/auth'
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
  const { t } = useTranslation('usuarios')
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
      const protectedModules = modulesData.modules.filter(
        (m) => m.permissionProtected && !m.systemReserved,
      )
      setModules(protectedModules)

      const map = {}
      ROLES.forEach((role) => {
        map[role] = {}
      })
      Object.entries(permsData.rolePermissions || {}).forEach(([role, keys]) => {
        if (!map[role]) map[role] = {}
        keys.forEach((key) => {
          map[role][key] = true
        })
      })
      setPermissions(map)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggle(role, moduleKey, checked) {
    const savingId = `${role}:${moduleKey}`
    const previous = permissions
    setPermissions((prev) => ({ ...prev, [role]: { ...prev[role], [moduleKey]: checked } }))
    setSavingKey(savingId)
    try {
      const data = await apiRequest(`/api/role-permissions/${role}`, {
        method: 'PATCH',
        body: { moduleKey, allowed: checked },
      })
      setPermissions((prev) => ({ ...prev, [role]: data.modules }))
      showToast(t('roleModulePermissionsCard.permissionUpdatedToast'), 'success')
    } catch (err) {
      setPermissions(previous)
      showToast(err.message || t('roleModulePermissionsCard.permissionUpdateErrorToast'), 'error')
    } finally {
      setSavingKey(null)
    }
  }

  async function openUsersDialog(module) {
    setUsersDialog({ module, users: [], loading: true })
    try {
      const data = await apiRequest(
        `/api/permissions/modules/${encodeURIComponent(module.key)}/users`,
      )
      setUsersDialog({ module, users: data.users, loading: false })
    } catch (err) {
      setUsersDialog({ module, users: [], loading: false, error: err.message })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}
      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('roleModulePermissionsCard.systemModulesHeader')}</TableHead>
              {ROLES.map((role) => (
                <TableHead key={role} className="text-center">
                  {getRoleLabels()[role]}
                </TableHead>
              ))}
              <TableHead className="text-right">
                {t('roleModulePermissionsCard.actionsHeader')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => {
              const Icon = getModuleIcon(m.icon)
              return (
                <TableRow key={m.key}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-[13.5px] font-bold">{m.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">{m.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  {ROLES.map((role) => {
                    const isAdmin = role === 'ADMINISTRADOR'
                    const checked = isAdmin || !!permissions?.[role]?.[m.key]
                    const savingId = `${role}:${m.key}`
                    const checkbox = (
                      <Checkbox
                        checked={checked}
                        disabled={isAdmin}
                        onCheckedChange={(value) => toggle(role, m.key, value === true)}
                      />
                    )
                    return (
                      <TableCell key={role} className="text-center">
                        {savingKey === savingId ? (
                          <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isAdmin ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {/* biome-ignore lint/a11y/noNoninteractiveTabindex: wrapper needed so Tooltip can trigger on a disabled Checkbox */}
                              <span className="inline-flex" tabIndex={0}>
                                {checkbox}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('roleModulePermissionsCard.adminFullAccessTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          checkbox
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right">
                    <Button variant="link" size="sm" onClick={() => openUsersDialog(m)}>
                      {t('roleModulePermissionsCard.usersWithAccessButton')}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!usersDialog} onOpenChange={(next) => !next && setUsersDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {usersDialog?.module
                ? t('roleModulePermissionsCard.usersWithAccessToModuleTitle', {
                    moduleName: usersDialog.module.name,
                  })
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-6 pb-6">
            {usersDialog?.loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : usersDialog?.error ? (
              <Alert variant="destructive">{usersDialog.error}</Alert>
            ) : usersDialog?.users.length === 0 ? (
              <p className="text-[13.5px] text-muted-foreground">
                {t('roleModulePermissionsCard.noUsersWithAccess')}
              </p>
            ) : (
              <div className="space-y-1">
                {usersDialog?.users.map((u) => (
                  <div key={u.id} className="py-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${getRoleLabels()[u.role] || u.role}${u.employeeNumber ? ` · ${u.employeeNumber}` : ''}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
