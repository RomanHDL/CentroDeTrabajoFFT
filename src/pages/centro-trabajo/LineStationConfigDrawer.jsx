import React, { useEffect, useMemo, useState } from 'react'
import Drawer from '@mui/material/Drawer'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { alpha } from '@mui/material/styles'
import { LINE_VISUAL_TYPE_ORDER } from '../../data/personnel/lineVisualType'
import {
  createLineStation, updateLineStation, deactivateLineStation, reorderLineStations,
} from '../../data/personnel/lineStationConfig'

const EMPTY_FORM = { name: '', requiredRoleLabel: '', category: '', quantity: 1, capacity: 1 }

/* Drawer administrativo "Configuración de puestos" (seccion 6-10 del
   pedido, "estaciones configurables por ADMINISTRADOR") -- EXCLUSIVO de
   WC LINEA 0-10, montado solo desde LineDetailDrawer.jsx y solo si
   isAdmin (el backend vuelve a validar el rol en cada endpoint, ver
   server-lib/auth.js/requireRole -- este componente nunca es la unica
   defensa). `workstations` = la MISMA lista ya resuelta que usa el
   tablero (getLineWorkstationsWithOccupancy), para poder bloquear
   eliminar/renombrar un puesto ocupado tambien en el cliente (el backend
   es quien realmente lo impide). */
export default function LineStationConfigDrawer({ open, onClose, lineId, areaName, workstations, editStationId, onChanged }) {
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
    if (!open) { setCreating(false); setEditingDbId(null); setForm(EMPTY_FORM); setError(''); setConfirmTarget(null) }
  }, [open])

  useEffect(() => {
    if (!open || !editStationId) return
    const w = workstations.find((s) => s.id === editStationId)
    if (w) startEdit(w)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editStationId])

  const sorted = useMemo(() => workstations.slice().sort((a, b) => a.order - b.order), [workstations])

  function startCreate() {
    setEditingDbId(null)
    setForm(EMPTY_FORM)
    setCreating(true)
    setError('')
  }

  function startEdit(w) {
    setCreating(false)
    setEditingDbId(w.id)
    setForm({ name: w.name, requiredRoleLabel: w.requiredRole || '', category: w.category || '', quantity: 1, capacity: w.capacity || 1 })
    setError('')
  }

  function cancelForm() {
    setCreating(false)
    setEditingDbId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  async function submitCreate() {
    if (!form.name.trim()) { setError('El nombre de la estación es obligatorio.'); return }
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
    if (!form.name.trim()) { setError('El nombre de la estación es obligatorio.'); return }
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
      await reorderLineStations(lineId, next.map((w) => w.id))
      onChanged?.()
    } catch (e) {
      setError(e.message || 'No se pudo reordenar.')
    } finally {
      setBusy(false)
    }
  }

  const formOpen = creating || !!editingDbId

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Configuración de puestos</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }} noWrap>{areaName}</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError('')}>{error}</Alert>}

        {confirmTarget && (
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Eliminar "{confirmTarget.name}"</Typography>
            {confirmTarget.occupants?.length > 0 ? (
              <Alert severity="warning">
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
                  Este puesto tiene a {confirmTarget.occupants.length === 1 ? '1 persona asignada' : `${confirmTarget.occupants.length} personas asignadas`}:
                </Typography>
                <Stack spacing={0.25} sx={{ mb: 0.75 }}>
                  {confirmTarget.occupants.map((o) => (
                    <Typography key={o.id} sx={{ fontSize: 12.5 }}>• {o.employee?.name || 'Empleado'}</Typography>
                  ))}
                </Stack>
                <Typography sx={{ fontSize: 12.5 }}>
                  Al eliminar este puesto, {confirmTarget.occupants.length === 1 ? 'pasará' : 'pasarán'} a <b>Personal sin estación</b> dentro
                  de esta línea, sin perder su asignación real ni su historial.
                </Typography>
              </Alert>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Este puesto está disponible, no tiene personal asignado.
              </Typography>
            )}
            <Divider />
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant="outlined" onClick={() => setConfirmTarget(null)} disabled={busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancelar
              </Button>
              <Button fullWidth variant="contained" color="error" disabled={busy} onClick={confirmDeactivate} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Eliminar puesto
              </Button>
            </Stack>
          </Stack>
        )}

        {!formOpen && !confirmTarget && (
          <>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {sorted.map((w, i) => (
                <Box key={w.id} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.disabled', flexShrink: 0 }}>{i + 1}.</Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5 }} noWrap>{w.name}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
                        Rol requerido: {w.requiredRole || '—'}
                      </Typography>
                      {w.category && (
                        <Chip size="small" label={w.category} sx={{ mt: 0.5, fontSize: 10, height: 18 }} />
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                      <IconButton size="small" disabled={i === 0 || busy} onClick={() => moveStation(i, -1)}><ArrowUpwardIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" disabled={i === sorted.length - 1 || busy} onClick={() => moveStation(i, 1)}><ArrowDownwardIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" onClick={() => startEdit(w)}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                      <IconButton size="small" color="error" onClick={() => requestDeactivate(w)}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
              {sorted.length === 0 && (
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', py: 2 }}>
                  Esta línea todavía no tiene puestos configurados.
                </Typography>
              )}
            </Stack>
            <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={startCreate} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Crear nuevo puesto
            </Button>
          </>
        )}

        {formOpen && (
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{creating ? 'Nuevo puesto' : 'Editar puesto'}</Typography>
            <TextField
              label="Nombre de la estación" size="small" fullWidth value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Rol requerido" size="small" fullWidth value={form.requiredRoleLabel}
              onChange={(e) => setForm((f) => ({ ...f, requiredRoleLabel: e.target.value }))}
            />
            <TextField
              select label="Categoría" size="small" fullWidth value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <MenuItem value="">Sin categoría</MenuItem>
              {LINE_VISUAL_TYPE_ORDER.map((t) => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
            </TextField>
            {creating ? (
              <TextField
                label="Cantidad de posiciones" size="small" type="number" fullWidth
                inputProps={{ min: 1, max: 20 }}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                helperText='Si es mayor a 1, se crean posiciones numeradas (ej. "Montaje", "Montaje 2"...).'
              />
            ) : (
              <TextField
                label="Capacidad (personas simultáneas)" size="small" type="number" fullWidth
                inputProps={{ min: 1 }}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            )}
            <Divider />
            <Stack direction="row" spacing={1}>
              <Button fullWidth variant="outlined" onClick={cancelForm} disabled={busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Cancelar
              </Button>
              <Button
                fullWidth variant="contained" disabled={busy}
                onClick={creating ? submitCreate : submitEdit}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {creating ? 'Crear puesto' : 'Guardar cambios'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
