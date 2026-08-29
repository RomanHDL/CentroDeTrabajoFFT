import { requireRole } from '../../../../server-lib/auth.js'
import {
  updateWorkstation,
  deactivateWorkstation,
  serializeWorkstation,
} from '../../../../server-lib/workstationConfig.ts'

const VALID_CATEGORIES = ['LIDERAZGO', 'CALIDAD', 'PRODUCCION', 'TECNICO', 'SUMINISTRO', 'APOYO']

// Editar o desactivar (soft-delete, `active:false`) un puesto -- solo ADMINISTRADOR. Nunca DELETE
// fisico (seccion 9 del pedido: "no eliminar registros historicos").
export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id ?? req.params?.id
  const { name, requiredRoleLabel, category, capacity, displayOrder, active } = req.body || {}

  if (category !== undefined && category !== null && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Categoria invalida' })
  }
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Nombre de estacion requerido' })
  }

  try {
    if (active === false) {
      const w = await deactivateWorkstation(id)
      return res.status(200).json({ workstation: serializeWorkstation(w) })
    }
    const w = await updateWorkstation(id, {
      name,
      requiredRoleLabel,
      category,
      capacity,
      displayOrder,
    })
    return res.status(200).json({ workstation: serializeWorkstation(w) })
  } catch (e) {
    if (e.code === 'OCCUPIED' || e.code === 'CAPACITY_BELOW_OCCUPANCY')
      return res.status(409).json({ error: e.message })
    if (e.code === 'P2002')
      return res.status(409).json({ error: 'Ya existe una estacion con ese nombre en esta linea' })
    if (e.code === 'P2025') return res.status(404).json({ error: 'Puesto no encontrado' })
    throw e
  }
})
