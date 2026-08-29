import { forwardRef, useState, useEffect } from 'react'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import RoleModulePermissionsCard from './RoleModulePermissionsCard'
import UserModulePermissionsCard from './UserModulePermissionsCard'

/* Contenedor unico de "Gestion de permisos" -- reemplaza a la vieja
   RoleModulePermissionsPanel.jsx suelta (2026-08-25, rediseño del modulo
   Usuarios): una sola Card con tabs POR ROL / POR USUARIO en vez de dos
   matrices separadas ("NO quiero mantener ambas matrices", pedido explicito
   del usuario). `focusUserId`/`onFocusUserHandled` permiten que la tabla de
   usuarios de UsuariosPage salte directo al tab POR USUARIO con ese usuario
   ya preseleccionado al hacer click en 🔑 Permisos. */
const PermissionsManagementCard = forwardRef(function PermissionsManagementCard({ users, focusUserId, onFocusUserHandled }, ref) {
  const [tab, setTab] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState(null)

  useEffect(() => {
    if (focusUserId) {
      setTab(1)
      setSelectedUserId(focusUserId)
      onFocusUserHandled?.()
    }
  }, [focusUserId, onFocusUserHandled])

  return (
    <Paper ref={ref} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mt: 3 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 16, mb: 0.5 }}>Gestión de permisos</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
        Qué módulos puede ver cada rol, y ajustes individuales por usuario.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36 }}>
        <Tab label="Por rol" sx={{ minHeight: 36, textTransform: 'none', fontWeight: 700 }} />
        <Tab label="Por usuario" sx={{ minHeight: 36, textTransform: 'none', fontWeight: 700 }} />
      </Tabs>

      <Box role="tabpanel" hidden={tab !== 0}>
        {tab === 0 && <RoleModulePermissionsCard />}
      </Box>
      <Box role="tabpanel" hidden={tab !== 1}>
        {tab === 1 && (
          <UserModulePermissionsCard users={users} selectedUserId={selectedUserId} onSelectUser={setSelectedUserId} />
        )}
      </Box>
    </Paper>
  )
})

export default PermissionsManagementCard
