import { apiRequest } from '../../state/auth'

// Helpers de fotos reales del organigrama (2026-09-14) -- mismo patron apiRequest que ya usa el
// resto de la app (fetch + credentials + JSON, tira Error con .status en fallas).

/* { [personId]: updatedAtISO } -- solo trae a quien ya tiene foto subida en OrgChartPhoto. */
export async function fetchOrgChartPhotoManifest() {
  const { photos } = await apiRequest('/api/organigrama/photos')
  return photos || {}
}

export async function uploadOrgChartPhoto(personId, mimeType, dataBase64) {
  return apiRequest(`/api/organigrama/${encodeURIComponent(personId)}/photo`, {
    method: 'POST',
    body: { mimeType, dataBase64 },
  })
}

export async function deleteOrgChartPhoto(personId) {
  return apiRequest(`/api/organigrama/${encodeURIComponent(personId)}/photo`, {
    method: 'DELETE',
  })
}

/* Foto EFECTIVA a mostrar: la real subida (si existe, servida por la API con `v` para
   cache-busting cuando cambia) tiene prioridad sobre la estatica de orgChartData.js -- nunca al
   reves, para que "cambiar foto" se refleje de inmediato en toda la pantalla. */
export function getEffectivePhotoSrc(personId, staticPhoto, photoVersions) {
  const version = photoVersions?.[personId]
  if (version)
    return `/api/organigrama/${encodeURIComponent(personId)}/photo?v=${encodeURIComponent(version)}`
  return staticPhoto || null
}
