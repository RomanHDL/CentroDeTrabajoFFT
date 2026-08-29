import dayjs from 'dayjs'
import { Copy, KeyRound, Loader2, MoreVertical, Pencil, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ROLE_LABELS } from '../../layout/roleLabels'
import { apiRequest } from '../../state/auth'
import { KpiCard } from '../../ui'
import { showToast } from '../../ui/toast'
import AdminToolsCard from './AdminToolsCard'
import CreateUserDialog from './CreateUserDialog'
import EditUserDialog from './EditUserDialog'
import PermissionsManagementCard from './permissions/PermissionsManagementCard'

export default function UsuariosPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [resetResult, setResetResult] = useState(null)
  const [resetChoiceUser, setResetChoiceUser] = useState(null)
  const [manualPassword, setManualPassword] = useState('')
  const [resetSaving, setResetSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)
  const [focusUserId, setFocusUserId] = useState(null)
  const permissionsCardRef = useRef(null)

  function openPermissionsFor(user) {
    setFocusUserId(user.id)
    permissionsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/api/users')
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const kpis = useMemo(
    () => ({
      activos: users.filter((u) => u.active).length,
      admins: users.filter((u) => u.role === 'ADMINISTRADOR').length,
      supervisores: users.filter((u) => u.role === 'SUPERVISOR').length,
      lideres: users.filter((u) => u.role === 'LIDER').length,
    }),
    [users],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.employeeNumber?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q),
    )
  }, [users, search])

  async function handleDeactivate() {
    const user = confirmDeactivate
    setConfirmDeactivate(null)
    const data = await apiRequest(`/api/users/${user.id}/deactivate`, { method: 'POST' })
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)))
  }

  function closeResetChoice() {
    setResetChoiceUser(null)
    setManualPassword('')
  }

  async function handleResetRandom(user) {
    const data = await apiRequest(`/api/users/${user.id}/reset-password`, { method: 'POST' })
    setResetResult({ user, temporaryPassword: data.temporaryPassword })
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, mustChangePassword: true } : u)))
    closeResetChoice()
  }

  async function handleResetManual(user) {
    if (manualPassword.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres', 'error')
      return
    }
    setResetSaving(true)
    try {
      await apiRequest(`/api/users/${user.id}/reset-password`, {
        method: 'POST',
        body: { password: manualPassword },
      })
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, mustChangePassword: false } : u)),
      )
      showToast('Contraseña actualizada', 'success')
      closeResetChoice()
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar la contraseña', 'error')
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <div>
      <p className="mb-4 text-[20px] font-extrabold">Usuarios del sistema</p>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard title="Usuarios activos" value={kpis.activos} accent="blue" />
        <KpiCard title="Administradores" value={kpis.admins} accent="purple" />
        <KpiCard title="Supervisores" value={kpis.supervisores} accent="green" />
        <KpiCard title="Líderes" value={kpis.lideres} accent="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative w-full sm:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, número o username"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="hidden flex-1 sm:block" />
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Agregar usuario
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="overflow-x-auto rounded-[20px] border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número empleado</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Sin usuarios que coincidan
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.employeeNumber || '—'}</TableCell>
                <TableCell className="font-semibold">{u.name}</TableCell>
                <TableCell>{u.username || '—'}</TableCell>
                <TableCell>{ROLE_LABELS[u.role] || u.role}</TableCell>
                <TableCell>
                  <Badge variant={u.active ? 'success' : 'outline'}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.lastLoginAt ? dayjs(u.lastLoginAt).format('DD/MM/YYYY HH:mm') : 'Nunca'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      title="Permisos"
                      onClick={() => openPermissionsFor(u)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => setEditUser(u)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditUser(u)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditUser(u)}>
                          Cambiar rol
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!u.active}
                          onClick={() => setConfirmDeactivate(u)}
                        >
                          Desactivar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetChoiceUser(u)}>
                          Restablecer contraseña
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PermissionsManagementCard
        ref={permissionsCardRef}
        users={users}
        focusUserId={focusUserId}
        onFocusUserHandled={() => setFocusUserId(null)}
      />
      <AdminToolsCard />

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(user) => {
          setUsers((prev) => [...prev, user])
          setCreateOpen(false)
        }}
      />

      <EditUserDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={(user) => {
          setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)))
          setEditUser(null)
        }}
      />

      <Dialog
        open={!!confirmDeactivate}
        onOpenChange={(next) => !next && setConfirmDeactivate(null)}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Desactivar usuario</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 text-sm">
            ¿Desactivar a <b>{confirmDeactivate?.name}</b>? No podrá iniciar sesión hasta que se
            reactive. Esto no elimina su cuenta.
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="ghost" onClick={() => setConfirmDeactivate(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeactivate}>
              Desactivar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetChoiceUser} onOpenChange={(next) => !next && closeResetChoice()}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Restablecer contraseña de {resetChoiceUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2">
            <p className="mb-4 text-[13.5px] text-muted-foreground">
              Genera una contraseña temporal aleatoria, o define tú mismo la contraseña nueva.
            </p>
            <Button
              variant="outline"
              className="mb-5 w-full font-normal normal-case"
              onClick={() => handleResetRandom(resetChoiceUser)}
            >
              Generar aleatoria
            </Button>
            <p className="mb-2 text-xs font-bold text-muted-foreground">
              O define la contraseña manualmente
            </p>
            <Input
              placeholder="Mínimo 8 caracteres"
              value={manualPassword}
              onChange={(e) => setManualPassword(e.target.value)}
            />
            <p className="mt-1 h-4 text-xs text-destructive">
              {manualPassword && manualPassword.length < 8 ? 'Mínimo 8 caracteres' : ' '}
            </p>
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="ghost" onClick={closeResetChoice}>
              Cancelar
            </Button>
            <Button
              disabled={resetSaving || manualPassword.length < 8}
              onClick={() => handleResetManual(resetChoiceUser)}
            >
              {resetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar contraseña'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetResult} onOpenChange={(next) => !next && setResetResult(null)}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Contraseña temporal generada</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2">
            <Alert variant="destructive" className="mb-4">
              Esta contraseña solo se muestra una vez. Entrégasela a {resetResult?.user?.name} de
              forma segura.
            </Alert>
            <div className="relative">
              <Input readOnly value={resetResult?.temporaryPassword || ''} className="pr-10" />
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(resetResult?.temporaryPassword || '')}
                className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex justify-end px-6 pb-6 pt-2">
            <Button onClick={() => setResetResult(null)}>Listo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
