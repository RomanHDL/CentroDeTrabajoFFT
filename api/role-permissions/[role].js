import { prisma } from '../../server-lib/prisma.js'
import { requireRole } from '../../server-lib/auth.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']
// "/usuarios" nunca es configurable aqui -- gestiona cuentas/contrasenas, se
// queda fijo en el codigo (Sidebar.jsx) solo para ADMINISTRADOR.
const VALID_MODULES = ['/dashboard', '/centro-trabajo', '/registro-personal']

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const role = req.query.role ?? req.params?.role
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido' })

  const { modules } = req.body || {}
  if (!Array.isArray(modules) || modules.some((m) => !VALID_MODULES.includes(m))) {
    return res.status(400).json({ error: 'Modulos invalidos' })
  }

  // Un admin nunca puede quitarse (ni quitarle a ningun ADMINISTRADOR) acceso
  // a un modulo -- evita que el propio admin se bloquee por accidente.
  if (role === 'ADMINISTRADOR' && VALID_MODULES.some((m) => !modules.includes(m))) {
    return res.status(400).json({ error: 'ADMINISTRADOR siempre debe tener los 3 modulos' })
  }

  const updated = await prisma.roleModuleAccess.upsert({
    where: { role },
    create: { role, modules },
    update: { modules },
  })
  return res.status(200).json({ role: updated.role, modules: updated.modules })
})
