// Observabilidad (MI Stack Reference, sección 13) -- HARD RULE del stack
// interno de la empresa. Real, no un stub: se activa solo cuando
// SENTRY_DSN existe en el entorno (pendiente de que el equipo de
// plataforma provisione un proyecto/DSN, ver checklist de credenciales
// entregado al usuario). Sin DSN, initSentry()/captureException() son
// no-ops seguros -- nunca rompen requests reales por falta de config.
import * as Sentry from '@sentry/node'

let initialized = false

export function initSentry() {
  if (initialized) return
  initialized = true
  if (!process.env.SENTRY_DSN) return
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  })
}

export function captureException(error, context) {
  if (!process.env.SENTRY_DSN) return
  initSentry()
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
