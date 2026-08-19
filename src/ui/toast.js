/* ─────────────────────────────────────────────
   Toast global minimo (pub-sub), mismo patron que
   data/personnel/repository.js (subscribe/notify) para no
   introducir una libreria nueva por un mensaje de confirmacion.
   ───────────────────────────────────────────── */

const listeners = new Set()
let seq = 0

export function subscribeToast(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function showToast(message, severity = 'success') {
  seq += 1
  const toast = { id: seq, message, severity }
  listeners.forEach((fn) => fn(toast))
}
