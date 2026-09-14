// Foto real de una persona del Organigrama (2026-09-14, a peticion explicita del usuario --
// "cambiar fotografia desde el propio organigrama... guardado real y persistente"). Las
// personas del organigrama NO son filas de Employee (son datos estaticos, ver orgChartData.js),
// asi que esto vive en su propia tabla (OrgChartPhoto), indexada por el mismo `id` string que ya
// usa orgChartData.js -- ORG_CHART_PERSON_IDS (misma fuente que consume el frontend, nunca una
// segunda lista a mano) es lo que valida que el id sea real antes de guardar nada.
//
// GET    -- sirve los bytes de la imagen (cualquier usuario logueado, es solo lectura).
// POST   -- sube/reemplaza la foto (SUPERVISOR/ADMINISTRADOR, mismo gate que mover/registrar
//           personal -- ver requireRole en api/personnel/move.js). Recibe { mimeType,
//           dataBase64 } (el recorte final ya hecho en el navegador) -- sharp valida que sea una
//           imagen real de verdad (nunca confia en mimeType/extension) y la reoptimiza a 512x512
//           WebP antes de guardarla, para no guardar archivos gigantes sin optimizar.
// DELETE -- quita la foto (mismo gate) -- la persona vuelve a mostrar su foto estatica original
//           (si la tenia) o iniciales, nunca borra a la persona ni ningun otro dato.

import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { requireAuth, requireRole } from '../../../server-lib/auth.js'
import { db, orgChartPhoto } from '../../../server-lib/db/client.js'
import { ORG_CHART_PERSON_IDS } from '../../../src/pages/organigrama/orgChartData.js'

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024 // 6MB decodificado -- el limite real de archivo (5MB,
// ver ChangePhotoDialog.jsx) mas margen; defensa en profundidad, el body de Express ya tiene su
// propio limite de 8mb (ver dev-server.js/prod-server.js).
const AVATAR_SIZE = 512

async function handleGet(req, res, personId) {
  const [row] = await db
    .select()
    .from(orgChartPhoto)
    .where(eq(orgChartPhoto.personId, personId))
    .limit(1)
  if (!row) return res.status(404).json({ error: 'Esta persona no tiene foto subida.' })

  const etag = `"${row.updatedAt.getTime()}"`
  if (req.headers['if-none-match'] === etag) return res.status(304).end()

  res.setHeader('Content-Type', row.mimeType)
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.setHeader('ETag', etag)
  return res.status(200).send(Buffer.from(row.data, 'base64'))
}

async function handlePost(req, res, personId) {
  const { dataBase64 } = req.body || {}
  if (!dataBase64 || typeof dataBase64 !== 'string') {
    return res.status(400).json({ error: 'Falta la imagen.' })
  }

  let buffer
  try {
    buffer = Buffer.from(dataBase64, 'base64')
  } catch {
    return res.status(400).json({ error: 'Imagen invalida.' })
  }
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(400).json({ error: 'La imagen debe pesar menos de 6MB.' })
  }

  // Nunca confiar en `mimeType`/extension del cliente -- sharp intenta decodificar los bytes de
  // verdad; si no es una imagen real, esto tira y devolvemos 400 (nunca 500 crudo).
  let optimized
  try {
    optimized = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return res.status(400).json({ error: 'El archivo no es una imagen valida.' })
  }

  const dataOut = optimized.toString('base64')
  const now = new Date()
  await db
    .insert(orgChartPhoto)
    .values({
      personId,
      mimeType: 'image/webp',
      data: dataOut,
      updatedAt: now,
      updatedByUserId: req.user.id,
    })
    .onConflictDoUpdate({
      target: orgChartPhoto.personId,
      set: { mimeType: 'image/webp', data: dataOut, updatedAt: now, updatedByUserId: req.user.id },
    })

  return res.status(200).json({ personId, updatedAt: now.toISOString() })
}

async function handleDelete(_req, res, personId) {
  await db.delete(orgChartPhoto).where(eq(orgChartPhoto.personId, personId))
  return res.status(200).json({ personId })
}

export default async (req, res) => {
  const personId = req.query.id ?? req.params?.id
  if (!ORG_CHART_PERSON_IDS.has(personId)) {
    return res.status(404).json({ error: 'Esa persona no existe en el organigrama.' })
  }

  if (req.method === 'GET') return requireAuth((r, s) => handleGet(r, s, personId))(req, res)
  if (req.method === 'POST') {
    return requireRole(['SUPERVISOR', 'ADMINISTRADOR'], (r, s) => handlePost(r, s, personId))(
      req,
      res,
    )
  }
  if (req.method === 'DELETE') {
    return requireRole(['SUPERVISOR', 'ADMINISTRADOR'], (r, s) => handleDelete(r, s, personId))(
      req,
      res,
    )
  }
  return res.status(405).json({ error: 'Method not allowed' })
}
