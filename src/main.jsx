import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './i18n'
import './index.css'
import App from './App'

// Observabilidad (MI Stack Reference, sección 13) -- HARD RULE. Real, no
// un stub: se activa solo si VITE_SENTRY_DSN existe en el build (pendiente
// de que plataforma provisione un proyecto/DSN, ver checklist de
// credenciales entregado al usuario). Sin DSN, init() nunca se llama --
// ErrorBoundary sigue funcionando como boundary normal de React.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Ocurrió un error inesperado. Recarga la página.</p>}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
