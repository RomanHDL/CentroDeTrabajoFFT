import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '../../../layout/roleLabels'
import { apiRequest } from '../../../state/auth'
import { showToast } from '../../../ui/toast'
import { getModuleIcon } from './moduleIcons'

const CONFIG_LABELS = {
  admin: 'Heredado de Administrador',
  role: 'Heredado del rol',
  ALLOW: 'Permiso personalizado',
  DENY: 'Denegado individualmente',
  inherit: 'Heredado del rol',
}

function configLabel(row, role) {
  if (role === 'ADMINISTRADOR') return CONFIG_LABELS.admin
  if (row.override === 'ALLOW') return CONFIG_LABELS.ALLOW
  if (row.override === 'DENY') return CONFIG_LABELS.DENY
  return CONFIG_LABELS.inherit
}

function userLabel(u) {
  return `${u.employeeNumber ? `${u.employeeNumber} — ` : ''}${u.name}`
}

const EFFECTS = ['INHERIT', 'ALLOW', 'DENY']

/* Tab "POR USUARIO" -- NUEVO (2026-08-25). Busca/selecciona un usuario y
   muestra, por modulo, el acceso EFECTIVO y su origen (heredado de
   Administrador / heredado del rol / permiso personalizado / denegado
   individualmente), con 3 botones HEREDAR/PERMITIR/DENEGAR que escriben el
   override via PATCH /api/users/:id/permissions/:moduleKey. `selectedUserId`
   es controlado por UsuariosPage para poder pre-seleccionar un usuario al
   hacer click en 🔑 desde la tabla. */
export default function UserModulePermissionsCard({ users, selectedUserId, onSelectUser }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savingKey, setSavingKey] = useState(null)

  // Combobox de busqueda de usuario -- reemplazo minimo de MUI Autocomplete
  // (no hay primitiva Combobox de shadcn en este repo, cmdk queda fuera de
  // alcance): Popover controlado + Input + lista filtrada de botones.
  const [comboOpen, setComboOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  )

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.employeeNumber?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q),
    )
  }, [users, query])

  const loadDetail = useCallback(async (userId) => {
    if (!userId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/api/users/${userId}/permissions`)
      setDetail(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDetail(selectedUserId)
  }, [selectedUserId, loadDetail])

  async function setEffect(moduleKey, effect) {
    const savingId = `${moduleKey}:${effect}`
    setSavingKey(savingId)
    try {
      const updated = await apiRequest(
        `/api/users/${selectedUserId}/permissions/${encodeURIComponent(moduleKey)}`,
        {
          method: 'PATCH',
          body: { effect },
        },
      )
      setDetail((prev) => ({
        ...prev,
        modules: prev.modules.map((m) => (m.moduleKey === moduleKey ? { ...m, ...updated } : m)),
      }))
      showToast('Permiso actualizado', 'success')
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el permiso', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  function selectUser(u) {
    onSelectUser(u.id)
    setQuery('')
    setComboOpen(false)
  }

  return (
    <div>
      <div className="mb-4 max-w-[420px]">
        <Label htmlFor="user-search" className="mb-1.5 block text-xs">
          Buscar usuario
        </Label>
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverAnchor asChild>
            <Input
              id="user-search"
              placeholder="Número de empleado, nombre o username"
              value={comboOpen ? query : selectedUser ? userLabel(selectedUser) : ''}
              onFocus={() => {
                setQuery(selectedUser ? userLabel(selectedUser) : '')
                setComboOpen(true)
              }}
              onChange={(e) => {
                setQuery(e.target.value)
                if (!comboOpen) setComboOpen(true)
              }}
            />
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="max-h-64 w-[420px] overflow-y-auto p-1"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => selectUser(u)}
                  className={cn(
                    'flex w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                    u.id === selectedUserId && 'bg-accent/60 font-semibold',
                  )}
                >
                  {userLabel(u)}
                </button>
              ))
            )}
          </PopoverContent>
        </Popover>
      </div>

      {!selectedUserId && (
        <p className="text-[13.5px] text-muted-foreground">
          Selecciona un usuario para ver y editar sus permisos individuales.
        </p>
      )}

      {selectedUserId && loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {selectedUserId && !loading && detail && (
        <div>
          <div className="mb-4 flex flex-wrap gap-6 rounded-[20px] bg-muted p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Nombre</p>
              <p className="text-[13.5px] font-bold">{detail.name}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Número</p>
              <p className="text-[13.5px] font-bold">{detail.employeeNumber || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Rol</p>
              <p className="text-[13.5px] font-bold">{ROLE_LABELS[detail.role] || detail.role}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Estado</p>
              <Badge variant={detail.active ? 'success' : 'outline'}>
                {detail.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Acceso efectivo</TableHead>
                  <TableHead>Configuración</TableHead>
                  <TableHead className="text-right">Cambiar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.modules.map((row) => {
                  const Icon = getModuleIcon(row.icon)
                  const isAdmin = detail.role === 'ADMINISTRADOR'
                  return (
                    <TableRow key={row.moduleKey}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                          <p className="text-[13px] font-semibold">{row.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.effective ? 'success' : 'outline'}>
                          {row.effective ? 'Permitido' : 'Sin acceso'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12.5px] text-muted-foreground">
                        {configLabel(row, detail.role)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <p className="text-[11.5px] italic text-muted-foreground">No aplica</p>
                        ) : (
                          <div className="inline-flex">
                            {EFFECTS.map((effect, idx) => {
                              const label =
                                effect === 'INHERIT'
                                  ? 'Heredar'
                                  : effect === 'ALLOW'
                                    ? 'Permitir'
                                    : 'Denegar'
                              const active =
                                (effect === 'INHERIT' && !row.override) || row.override === effect
                              const savingId = `${row.moduleKey}:${effect}`
                              const variant = active
                                ? effect === 'DENY'
                                  ? 'destructive'
                                  : effect === 'ALLOW'
                                    ? 'success'
                                    : 'default'
                                : 'outline'
                              return (
                                <Button
                                  key={effect}
                                  variant={variant}
                                  size="sm"
                                  disabled={savingKey === savingId}
                                  onClick={() => setEffect(row.moduleKey, effect)}
                                  className={cn(
                                    'text-[11.5px]',
                                    idx === 0 && 'rounded-r-none',
                                    idx === 1 && '-ml-px rounded-none',
                                    idx === 2 && '-ml-px rounded-l-none',
                                  )}
                                >
                                  {savingKey === savingId ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    label
                                  )}
                                </Button>
                              )
                            })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
