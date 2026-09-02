// Aviso best-effort a Mattermost (2026-09-02, flujo "Solicitar acceso" via SSO) -- mismo
// patron no-op-seguro que server-lib/sentry.js: sin MM_URL/MM_BOT_TOKEN/MM_CHANNEL_ID
// configuradas, simplemente no hace nada (la solicitud ya quedo registrada en la BD de
// todas formas, un admin la ve en Usuarios > Solicitudes de acceso). Nunca lanza -- un
// fallo de red/token invalido no debe tumbar la solicitud real.
export async function postAccessRequestNotice(text) {
  const { MM_URL, MM_BOT_TOKEN, MM_CHANNEL_ID } = process.env
  if (!MM_URL || !MM_BOT_TOKEN || !MM_CHANNEL_ID) {
    console.warn(
      '[mattermost] MM_URL/MM_BOT_TOKEN/MM_CHANNEL_ID no configuradas -- solicitud de acceso registrada pero sin aviso.',
    )
    return
  }
  try {
    const res = await fetch(`${MM_URL.replace(/\/$/, '')}/api/v4/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MM_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel_id: MM_CHANNEL_ID, message: text }),
    })
    if (!res.ok) {
      console.error('[mattermost] fallo al publicar aviso:', res.status, await res.text())
    }
  } catch (e) {
    console.error('[mattermost] error al publicar aviso:', e)
  }
}
