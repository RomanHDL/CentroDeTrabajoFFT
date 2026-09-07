// 2026-09-07 (encontrado en vivo al probar "Eliminar usuario": un 23503 real
// -- foreign key violation, usuario con registros historicos -- llegaba como
// 500 generico en vez del 409 con mensaje claro que ya devolvia el catch).
// Causa raiz: drizzle-orm 0.45 envuelve TODO error de query en DrizzleQueryError
// (ver node_modules/drizzle-orm/pg-core/session.js, queryWithCache) -- el error
// real de Postgres (con `.code`/`.constraint`) queda en `.cause`, nunca en el
// objeto atrapado directamente. Los `catch (e) { if (e.code === '23505') ... }`
// que ya existian en varios endpoints (api/users, access-requests, personnel/
// checkin, personnel/set-unassigned-reason) nunca hacian match por lo mismo --
// bug preexistente, no introducido hoy, solo recien descubierto.
export function pgError(e) {
  return e?.cause?.code ? e.cause : e
}
