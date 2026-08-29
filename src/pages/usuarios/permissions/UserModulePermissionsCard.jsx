import { useEffect, useMemo, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import ButtonGroup from '@mui/material/ButtonGroup'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { apiRequest } from '../../../state/auth'
import { ROLE_LABELS } from '../../../layout/roleLabels'
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

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) || null,
    [users, selectedUserId],
  )

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

  return (
    <Box>
      <Autocomplete
        options={users}
        value={selectedUser}
        onChange={(_, value) => onSelectUser(value?.id || null)}
        getOptionLabel={(u) => `${u.employeeNumber ? `${u.employeeNumber} — ` : ''}${u.name}`}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Buscar usuario"
            placeholder="Número de empleado, nombre o username"
          />
        )}
        sx={{ maxWidth: 420, mb: 2 }}
      />

      {!selectedUserId && (
        <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>
          Selecciona un usuario para ver y editar sus permisos individuales.
        </Typography>
      )}

      {selectedUserId && loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {selectedUserId && !loading && detail && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              gap: 3,
              flexWrap: 'wrap',
              mb: 2,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Nombre</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{detail.name}</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Número</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                {detail.employeeNumber || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Rol</Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                {ROLE_LABELS[detail.role] || detail.role}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Estado</Typography>
              <Chip
                size="small"
                label={detail.active ? 'Activo' : 'Inactivo'}
                color={detail.active ? 'success' : 'default'}
              />
            </Box>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Módulo</TableCell>
                  <TableCell>Acceso efectivo</TableCell>
                  <TableCell>Configuración</TableCell>
                  <TableCell align="right">Cambiar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.modules.map((row) => {
                  const Icon = getModuleIcon(row.icon)
                  const isAdmin = detail.role === 'ADMINISTRADOR'
                  return (
                    <TableRow key={row.moduleKey} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {Icon && <Icon fontSize="small" sx={{ color: 'text.secondary' }} />}
                          <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{row.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.effective ? 'Permitido' : 'Sin acceso'}
                          color={row.effective ? 'success' : 'default'}
                          variant={row.effective ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                        {configLabel(row, detail.role)}
                      </TableCell>
                      <TableCell align="right">
                        {isAdmin ? (
                          <Typography
                            sx={{ fontSize: 11.5, color: 'text.secondary', fontStyle: 'italic' }}
                          >
                            No aplica
                          </Typography>
                        ) : (
                          <ButtonGroup size="small" variant="outlined">
                            {['INHERIT', 'ALLOW', 'DENY'].map((effect) => {
                              const label =
                                effect === 'INHERIT'
                                  ? 'Heredar'
                                  : effect === 'ALLOW'
                                    ? 'Permitir'
                                    : 'Denegar'
                              const active =
                                (effect === 'INHERIT' && !row.override) || row.override === effect
                              const savingId = `${row.moduleKey}:${effect}`
                              return (
                                <Button
                                  key={effect}
                                  variant={active ? 'contained' : 'outlined'}
                                  color={
                                    effect === 'DENY'
                                      ? 'error'
                                      : effect === 'ALLOW'
                                        ? 'success'
                                        : 'primary'
                                  }
                                  disabled={savingKey === savingId}
                                  onClick={() => setEffect(row.moduleKey, effect)}
                                  sx={{ textTransform: 'none', fontSize: 11.5 }}
                                >
                                  {savingKey === savingId ? <CircularProgress size={12} /> : label}
                                </Button>
                              )
                            })}
                          </ButtonGroup>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Box>
  )
}
