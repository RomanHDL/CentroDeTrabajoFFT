import { isOidcConfigured } from '../../../server-lib/oidc.js'

// Fase 5 (OIDC). LoginPage.jsx consulta esto para decidir que mostrar:
// SOLO Nextcloud si ya esta configurado (reemplaza el login local, igual
// que en Cubicaje), o SOLO el login local mientras no lleguen las 4
// variables reales -- nunca ambos a la vez, y nunca deja a nadie sin
// forma de entrar.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(200).json({ configured: isOidcConfigured() })
}
