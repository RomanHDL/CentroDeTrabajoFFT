// Loader temporal SOLO para poder ejecutar seed-personnel.mjs con Node puro: los modulos bajo
// src/ usan imports relativos SIN extension (validos para Vite/el bundler del frontend, pero el
// resolver ESM estricto de Node no los acepta). No se puede tocar nada bajo src/ (fase 1 es
// backend-only), asi que este loader reintenta con ".js" cuando la resolucion por defecto falla.
// Uso: node --import ./scripts/_esm-extensionless-loader.mjs scripts/seed-personnel.mjs
import { register } from 'node:module'

register(import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (specifier.startsWith('.') && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    throw err
  }
}
