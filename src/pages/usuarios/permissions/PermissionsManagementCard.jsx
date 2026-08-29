import { forwardRef, useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RoleModulePermissionsCard from './RoleModulePermissionsCard'
import UserModulePermissionsCard from './UserModulePermissionsCard'

/* Contenedor unico de "Gestion de permisos" -- reemplaza a la vieja
   RoleModulePermissionsPanel.jsx suelta (2026-08-25, rediseño del modulo
   Usuarios): una sola Card con tabs POR ROL / POR USUARIO en vez de dos
   matrices separadas ("NO quiero mantener ambas matrices", pedido explicito
   del usuario). `focusUserId`/`onFocusUserHandled` permiten que la tabla de
   usuarios de UsuariosPage salte directo al tab POR USUARIO con ese usuario
   ya preseleccionado al hacer click en 🔑 Permisos. */
const PermissionsManagementCard = forwardRef(function PermissionsManagementCard(
  { users, focusUserId, onFocusUserHandled },
  ref,
) {
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
    <div ref={ref} className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">Gestión de permisos</p>
      <p className="mb-3 text-[13px] text-muted-foreground">
        Qué módulos puede ver cada rol, y ajustes individuales por usuario.
      </p>

      <Tabs value={String(tab)} onValueChange={(v) => setTab(Number(v))}>
        <TabsList className="mb-4">
          <TabsTrigger value="0">Por rol</TabsTrigger>
          <TabsTrigger value="1">Por usuario</TabsTrigger>
        </TabsList>
        <TabsContent value="0">
          <RoleModulePermissionsCard />
        </TabsContent>
        <TabsContent value="1">
          <UserModulePermissionsCard
            users={users}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
})

export default PermissionsManagementCard
