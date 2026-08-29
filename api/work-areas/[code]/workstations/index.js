import { requireAuth } from '../../../../server-lib/auth.js'
import {
  resolveWorkArea,
  listWorkstations,
  createWorkstations,
  nextDisplayOrder,
  serializeWorkstation,
} from '../../../../server-lib/workstationConfig.ts'

const VALID_CATEGORIES = ['LIDERAZGO', 'CALIDAD', 'PRODUCCION', 'TECNICO', 'SUMINISTRO', 'APOYO']

// GET: cualquier usuario autenticado (lectura, igual que el resto de Centro de Trabajo).
// POST: solo ADMINISTRADOR -- verificado aqui contra req.user.role, NUNCA confiando en el
// frontend (seccion 10 del pedido: "la seguridad no puede ser solamente frontend").
export default requireAuth(async (req, res) => {
  const code = req.query.code ?? req.params?.code
  const workArea = await resolveWorkArea(code)
  if (!workArea) return res.status(404).json({ error: 'Area de trabajo no encontrada' })

  if (req.method === 'GET') {
    const rows = await listWorkstations(workArea.id)
    return res.status(200).json({ workstations: rows.map(serializeWorkstation) })
  }

  if (req.method === 'POST') {
    if (req.user.role !== 'ADMINISTRADOR')
      return res.status(403).json({ error: 'No autorizado para esta accion' })

    const { name, requiredRoleLabel, category, capacity, quantity } = req.body || {}
    if (!name || !String(name).trim())
      return res.status(400).json({ error: 'Nombre de estacion requerido' })
    if (category && !VALID_CATEGORIES.includes(category))
      return res.status(400).json({ error: 'Categoria invalida' })

    try {
      const displayOrderStart = await nextDisplayOrder(workArea.id)
      const rows = await createWorkstations({
        workAreaId: workArea.id,
        baseName: String(name).trim(),
        requiredRoleLabel: requiredRoleLabel || null,
        category: category || null,
        capacity,
        quantity,
        displayOrderStart,
      })
      return res.status(201).json({ workstations: rows.map(serializeWorkstation) })
    } catch (e) {
      if (e.code === 'P2002')
        return res
          .status(409)
          .json({ error: 'Ya existe una estacion con ese nombre en esta linea' })
      throw e
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
