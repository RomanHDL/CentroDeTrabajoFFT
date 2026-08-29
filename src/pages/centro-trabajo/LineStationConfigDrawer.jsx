import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { alertToneClass, metricChipClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import {
  createLineStation,
  deactivateLineStation,
  reorderLineStations,
  updateLineStation,
} from '../../data/personnel/lineStationConfig'
import { LINE_VISUAL_TYPE_ORDER } from '../../data/personnel/lineVisualType'

const EMPTY_FORM = { name: '', requiredRoleLabel: '', category: '', quantity: 1, capacity: 1 }

// Radix <Select.Item> no acepta value="" (revienta en runtime) -- este
// sentinel solo vive dentro del <Select>, el estado real (form.category)
// sigue guardando '' para "sin categoría" exactamente como antes.
const NO_CATEGORY = '__none__'

/* Drawer administrativo "Configuración de puestos" (seccion 6-10 del
   pedido, "estaciones configurables por ADMINISTRADOR") -- EXCLUSIVO de
   WC LINEA 0-10, montado solo desde LineDetailDrawer.jsx y solo si
   isAdmin (el backend vuelve a validar el rol en cada endpoint, ver
   server-lib/auth.js/requireRole -- este componente nunca es la unica
   defensa). `workstations` = la MISMA lista ya resuelta que usa el
   tablero (getLineWorkstationsWithOccupancy), para poder bloquear
   eliminar/renombrar un puesto ocupado tambien en el cliente (el backend
   es quien realmente lo impide). */
export default function LineStationConfigDrawer({
  open,
  onClose,
  lineId,
  areaName,
  workstations,
  editStationId,
  onChanged,
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingDbId, setEditingDbId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // 2026-08-28 ("CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a peticion explicita del
  // usuario): eliminar un puesto ya NO se bloquea por ocupacion -- si tenia gente real, pasa a
  // "Personal sin estación" dentro de esta misma línea (getPeopleWithoutStation,
  // personnelByArea.js), nunca se pierde. En vez de bloquear, se avisa con los ocupantes REALES
  // tomados de `workstations` (el mismo prop que ya trae occupants desde localStorage, la fuente
  // que de verdad ve el usuario en pantalla -- nunca una consulta nueva a Postgres).
  const [confirmTarget, setConfirmTarget] = useState(null)

  useEffect(() => {
    if (!open) {
      setCreating(false)
      setEditingDbId(null)
      setForm(EMPTY_FORM)
      setError('')
      setConfirmTarget(null)
    }
  }, [open])

  // `startEdit`/`workstations` intencionalmente fuera de deps -- solo debe
  // dispararse cuando se abre o cambia editStationId (prop), no en cada
  // render por identidad nueva de la funcion/arreglo (comportamiento
  // original preservado, antes suprimido via eslint-disable-next-line).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  useEffect(() => {
    if (!open || !editStationId) return
    const w = workstations.find((s) => s.id === editStationId)
    if (w) startEdit(w)
  }, [open, editStationId])

  const sorted = useMemo(
    () => workstations.slice().sort((a, b) => a.order - b.order),
    [workstations],
  )

  function startCreate() {
    setEditingDbId(null)
    setForm(EMPTY_FORM)
    setCreating(true)
    setError('')
  }

  function startEdit(w) {
    setCreating(false)
    setEditingDbId(w.id)
    setForm({
      name: w.name,
      requiredRoleLabel: w.requiredRole || '',
      category: w.category || '',
      quantity: 1,
      capacity: w.capacity || 1,
    })
    setError('')
  }

  function cancelForm() {
    setCreating(false)
    setEditingDbId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function submitCreate() {
    if (!form.name.trim()) {
      setError('El nombre de la estación es obligatorio.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await createLineStation(lineId, {
        name: form.name.trim(),
        requiredRoleLabel: form.requiredRoleLabel.trim() || null,
        category: form.category || null,
        quantity: Number(form.quantity) || 1,
        capacity: Number(form.capacity) || 1,
      })
      cancelForm()
      onChanged?.()
    } catch (e) {
      setError(e.message || 'No se pudo crear el puesto.')
    } finally {
      setBusy(false)
    }
  }

  async function submitEdit() {
    if (!form.name.trim()) {
      setError('El nombre de la estación es obligatorio.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateLineStation(lineId, editingDbId, {
        name: form.name.trim(),
        requiredRoleLabel: form.requiredRoleLabel.trim() || null,
        category: form.category || null,
        capacity: Number(form.capacity) || 1,
      })
      cancelForm()
      onChanged?.()
    } catch (e) {
      setError(e.message || 'No se pudo guardar el puesto.')
    } finally {
      setBusy(false)
    }
  }

  function requestDeactivate(w) {
    setError('')
    setConfirmTarget(w)
  }

  async function confirmDeactivate() {
    const w = confirmTarget
    setConfirmTarget(null)
    setBusy(true)
    setError('')
    try {
      await deactivateLineStation(lineId, w.id)
      onChanged?.()
    } catch (e) {
      setError(e.message || 'No se pudo eliminar el puesto.')
    } finally {
      setBusy(false)
    }
  }

  async function moveStation(index, direction) {
    const target = index + direction
    if (target < 0 || target >= sorted.length) return
    const next = sorted.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    setBusy(true)
    setError('')
    try {
      await reorderLineStations(
        lineId,
        next.map((w) => w.id),
      )
      onChanged?.()
    } catch (e) {
      setError(e.message || 'No se pudo reordenar.')
    } finally {
      setBusy(false)
    }
  }

  const formOpen = creating || !!editingDbId

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="left-auto top-0 right-0 bottom-0 flex w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-none sm:w-[460px]">
        <DialogTitle className="sr-only">Configuración de puestos — {areaName}</DialogTitle>

        <div className="flex items-center gap-2 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold">Configuración de puestos</p>
            <p className="truncate text-[12.5px] text-muted-foreground">{areaName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <Alert className={cn(alertToneClass('error'), 'relative mb-3 pr-9')}>
              {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="absolute right-2 top-2 rounded-full p-1 hover:bg-black/[.06] dark:hover:bg-white/[.08]"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          )}

          {confirmTarget && (
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-extrabold">Eliminar "{confirmTarget.name}"</p>
              {confirmTarget.occupants?.length > 0 ? (
                <Alert className={alertToneClass('warning')}>
                  <p className="mb-1 text-[13px] font-bold">
                    Este puesto tiene a{' '}
                    {confirmTarget.occupants.length === 1
                      ? '1 persona asignada'
                      : `${confirmTarget.occupants.length} personas asignadas`}
                    :
                  </p>
                  <div className="mb-1.5 flex flex-col gap-0.5">
                    {confirmTarget.occupants.map((o) => (
                      <p key={o.id} className="text-[12.5px]">
                        • {o.employee?.name || 'Empleado'}
                      </p>
                    ))}
                  </div>
                  <p className="text-[12.5px]">
                    Al eliminar este puesto,{' '}
                    {confirmTarget.occupants.length === 1 ? 'pasará' : 'pasarán'} a{' '}
                    <b>Personal sin estación</b> dentro de esta línea, sin perder su asignación real
                    ni su historial.
                  </p>
                </Alert>
              ) : (
                <p className="text-[12.5px] text-muted-foreground">
                  Este puesto está disponible, no tiene personal asignado.
                </p>
              )}
              <div className="border-t border-border" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmTarget(null)}
                  disabled={busy}
                  className="flex-1 font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={confirmDeactivate}
                  className="flex-1 font-bold"
                >
                  Eliminar puesto
                </Button>
              </div>
            </div>
          )}

          {!formOpen && !confirmTarget && (
            <>
              <div className="mb-4 flex flex-col gap-2">
                {sorted.map((w, i) => (
                  <div key={w.id} className="rounded-[20px] border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <p className="shrink-0 text-[11px] font-extrabold text-muted-foreground/50">
                        {i + 1}.
                      </p>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold">{w.name}</p>
                        <p className="truncate text-[11.5px] text-muted-foreground">
                          Rol requerido: {w.requiredRole || '—'}
                        </p>
                        {w.category && (
                          <span className={cn(metricChipClass('default'), 'mt-1')}>
                            {w.category}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          disabled={i === 0 || busy}
                          onClick={() => moveStation(i, -1)}
                          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={i === sorted.length - 1 || busy}
                          onClick={() => moveStation(i, 1)}
                          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(w)}
                          className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDeactivate(w)}
                          className="grid h-7 w-7 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {sorted.length === 0 && (
                  <p className="py-4 text-center text-[12.5px] text-muted-foreground">
                    Esta línea todavía no tiene puestos configurados.
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={startCreate} className="w-full font-bold">
                <Plus className="h-4 w-4" />
                Crear nuevo puesto
              </Button>
            </>
          )}

          {formOpen && (
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-extrabold">
                {creating ? 'Nuevo puesto' : 'Editar puesto'}
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="station-name">Nombre de la estación</Label>
                <Input
                  id="station-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="station-role">Rol requerido</Label>
                <Input
                  id="station-role"
                  value={form.requiredRoleLabel}
                  onChange={(e) => setForm((f) => ({ ...f, requiredRoleLabel: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="station-category">Categoría</Label>
                <Select
                  value={form.category || NO_CATEGORY}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v === NO_CATEGORY ? '' : v }))
                  }
                >
                  <SelectTrigger id="station-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                    {LINE_VISUAL_TYPE_ORDER.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {creating ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="station-quantity">Cantidad de posiciones</Label>
                  <Input
                    id="station-quantity"
                    type="number"
                    min={1}
                    max={20}
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                  <p className="text-[12px] text-muted-foreground">
                    Si es mayor a 1, se crean posiciones numeradas (ej. "Montaje", "Montaje 2"...).
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="station-capacity">Capacidad (personas simultáneas)</Label>
                  <Input
                    id="station-capacity"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  />
                </div>
              )}
              <div className="border-t border-border" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={cancelForm}
                  disabled={busy}
                  className="flex-1 font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={busy}
                  onClick={creating ? submitCreate : submitEdit}
                  className="flex-1 font-bold"
                >
                  {creating ? 'Crear puesto' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
