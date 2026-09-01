import * as client from 'openid-client'
import {
  buildAuthorizationRedirectUrl,
  buildTxnCookie,
  isOidcConfigured,
} from '../../../server-lib/oidc.js'

// Fase 5 (OIDC). Sin las 4 variables reales configuradas, esta ruta "no
// existe" (404) -- ver server-lib/oidc.js.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!isOidcConfigured()) return res.status(404).json({ error: 'SSO no configurado' })

  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()

  res.setHeader('Set-Cookie', buildTxnCookie({ codeVerifier, state }))
  const redirectUrl = await buildAuthorizationRedirectUrl({ state, codeChallenge })
  res.writeHead(302, { Location: redirectUrl })
  res.end()
}
