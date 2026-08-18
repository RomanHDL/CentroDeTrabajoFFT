import { useEffect, useMemo, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import dayjs from 'dayjs'
import { apiRequest } from '../../state/auth'
import { ROLE_LABELS } from '../../layout/roleLabels'
import { KpiCard } from '../../ui'
import CreateUserDialog from './CreateUserDialog'
import EditUserDialog from './EditUserDialog'

export default function UsuariosPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [menuState, setMenuState] = useState({ anchor: null, user: null })
  const [resetResult, setResetResult] = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)

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

  useEffect(() => { load() }, [load])

  const kpis = useMemo(() => ({
    activos: users.filter((u) => u.active).length,
    admins: users.filter((u) => u.role === 'ADMINISTRADOR').length,
    supervisores: users.filter((u) => u.role === 'SUPERVISOR').length,
    lideres: users.filter((u) => u.role === 'LIDER').length,
  }), [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.name?.toLowerCase().includes(q) ||
      u.employeeNumber?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    )
  }, [users, search])

  function openMenu(e, user) { setMenuState({ anchor: e.currentTarget, user }) }
  function closeMenu() { setMenuState({ anchor: null, user: null }) }

  async function handleDeactivate() {
    const user = confirmDeactivate
    setConfirmDeactivate(null)
    const data = await apiRequest(`/api/users/${user.id}/deactivate`, { method: 'POST' })
    setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user : u)))
  }

  async function handleResetPassword(user) {
    closeMenu()
    const data = await apiRequest(`/api/users/${user.id}/reset-password`, { method: 'POST' })
    setResetResult({ user, temporaryPassword: data.temporaryPassword })
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, mustChangePassword: true } : u)))
  }

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 20, mb: 2 }}>Usuarios del sistema</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><KpiCard title="Usuarios activos" value={kpis.activos} accent="blue" /></Grid>
        <Grid item xs={6} sm={3}><KpiCard title="Administradores" value={kpis.admins} accent="purple" /></Grid>
        <Grid item xs={6} sm={3}><KpiCard title="Supervisores" value={kpis.supervisores} accent="green" /></Grid>
        <Grid item xs={6} sm={3}><KpiCard title="Líderes" value={kpis.lideres} accent="amber" /></Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre, número o username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 280 }, minWidth: 0 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Agregar usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Número empleado</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Último acceso</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin usuarios que coincidan</TableCell></TableRow>
            )}
            {filtered.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.employeeNumber || '—'}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{u.name}</TableCell>
                <TableCell>{u.username || '—'}</TableCell>
                <TableCell>{ROLE_LABELS[u.role] || u.role}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.active ? 'Activo' : 'Inactivo'} color={u.active ? 'success' : 'default'} variant={u.active ? 'filled' : 'outlined'} />
                </TableCell>
                <TableCell>{u.lastLoginAt ? dayjs(u.lastLoginAt).format('DD/MM/YYYY HH:mm') : 'Nunca'}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => openMenu(e, u)}><MoreVertIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Menu anchorEl={menuState.anchor} open={!!menuState.anchor} onClose={closeMenu}>
        <MenuItem onClick={() => { setEditUser(menuState.user); closeMenu() }}>Editar</MenuItem>
        <MenuItem onClick={() => { setEditUser(menuState.user); closeMenu() }}>Cambiar rol</MenuItem>
        <MenuItem onClick={() => { setConfirmDeactivate(menuState.user); closeMenu() }} disabled={!menuState.user?.active}>
          Desactivar
        </MenuItem>
        <MenuItem onClick={() => handleResetPassword(menuState.user)}>Restablecer contraseña</MenuItem>
      </Menu>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(user) => { setUsers((prev) => [...prev, user]); setCreateOpen(false) }}
      />

      <EditUserDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={(user) => { setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u))); setEditUser(null) }}
      />

      <Dialog open={!!confirmDeactivate} onClose={() => setConfirmDeactivate(null)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Desactivar usuario</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Desactivar a <b>{confirmDeactivate?.name}</b>? No podrá iniciar sesión hasta que se reactive. Esto no elimina su cuenta.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeactivate(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDeactivate}>Desactivar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!resetResult} onClose={() => setResetResult(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Contraseña temporal generada</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta contraseña solo se muestra una vez. Entrégasela a {resetResult?.user?.name} de forma segura.
          </Alert>
          <TextField
            fullWidth
            value={resetResult?.temporaryPassword || ''}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => navigator.clipboard?.writeText(resetResult?.temporaryPassword || '')}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetResult(null)} variant="contained">Listo</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
