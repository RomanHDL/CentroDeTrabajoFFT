import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import ListItemIcon from '@mui/material/ListItemIcon'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LockResetIcon from '@mui/icons-material/LockReset'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAuth } from '../state/auth'
import { ROLE_LABELS } from './roleLabels'
import NotificationBell from './NotificationBell'

function initialsOf(name) {
  return (
    (name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  )
}

/* 2026-08-27 ("rediseño del header de Centro de Trabajo", a peticion
   explicita del usuario): campana + modo claro/oscuro + perfil (avatar +
   nombre + rol + menu de cuenta), EXTRAIDO tal cual de AppLayout.jsx (misma
   logica/handlers/datos reales de useAuth, cero duplicacion) para poder
   reutilizarlo tanto en la barra superior global (AppLayout.jsx, todas las
   demas paginas) como en el nuevo header propio de Centro de Trabajo
   (CentroTrabajoPage.jsx) sin mantener dos copias de este bloque. */
export default function HeaderUserActions({ mode, setMode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuAnchor, setMenuAnchor] = useState(null)

  const roleLabel = ROLE_LABELS[user?.role] || user?.role
  const canApproveMoves = user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRADOR'

  async function handleLogout() {
    setMenuAnchor(null)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {canApproveMoves && <NotificationBell userId={user?.id} />}
      <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
        <IconButton
          size="small"
          onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))}
          sx={{
            transition: 'background-color 200ms ease, color 200ms ease',
            '&:hover': {
              bgcolor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(96,165,250,.14)' : 'rgba(59,130,246,.10)',
            },
          }}
        >
          {mode === 'light' ? (
            <DarkModeIcon fontSize="small" />
          ) : (
            <LightModeIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <Box
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          ml: 0.5,
          px: 1,
          py: 0.5,
          borderRadius: 2,
          transition: 'background-color 200ms ease',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Avatar sx={{ width: 34, height: 34, fontSize: 14, fontWeight: 700, bgcolor: '#3B82F6' }}>
          {initialsOf(user?.name)}
        </Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1.1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{user?.name}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{roleLabel}</Typography>
        </Box>
      </Box>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {roleLabel} · Mi cuenta
          </Typography>
        </Box>
        <Divider />
        {user?.role === 'ADMINISTRADOR' && (
          <MenuItem
            onClick={() => {
              setMenuAnchor(null)
              navigate('/cambiar-contrasena')
            }}
          >
            <ListItemIcon>
              <LockResetIcon fontSize="small" />
            </ListItemIcon>
            Cambiar contraseña
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Cerrar sesión
        </MenuItem>
      </Menu>
    </>
  )
}
