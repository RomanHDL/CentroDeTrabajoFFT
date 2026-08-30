// User Manual -- ayuda real para usuarios finales (MI Stack Reference,
// sección 17a, HARD RULE). Contenido separado de la presentación
// (UserManualPage.jsx). Refleja el estado REAL de cada módulo -- KPI's/
// Asistencia/Auditoría están marcados "próximamente" a propósito, son
// placeholders reales en el código (ComingSoonPage), no se inventa
// funcionalidad que todavía no existe.
//
// Textos traducibles movidos a public/locales/*/docs.json (namespace
// "docs", sub-objeto "userManualData") -- este archivo solo guarda
// estructura/IDs estables (nameKey/statusLabelKey/bodyKey). `status` sigue
// siendo un literal 'disponible' / 'próximamente' SIN traducir -- es un
// código interno de lógica que UserManualPage.jsx compara para elegir el
// variant del Badge (`mod.status === 'disponible' ? 'success' : 'outline'`).
// Como ese mismo valor también se muestra como texto del Badge,
// `statusLabelKey` aparte resuelve la etiqueta visible traducible sin tocar
// el literal de lógica. `nameKey` referencia claves YA existentes en
// public/locales/*/navigation.json (mismo texto exacto, ya extraído ahí).

export const MODULES = [
  {
    nameKey: 'dashboard',
    status: 'disponible',
    statusLabelKey: 'statusDisponible',
    bodyKey: 'dashboardBody',
  },
  {
    nameKey: 'centroDeTrabajo',
    status: 'disponible',
    statusLabelKey: 'statusDisponible',
    bodyKey: 'centroTrabajoBody',
  },
  {
    nameKey: 'usuarios',
    status: 'disponible',
    statusLabelKey: 'statusDisponible',
    bodyKey: 'usuariosBody',
  },
  {
    nameKey: 'registroDePersonal',
    status: 'disponible',
    statusLabelKey: 'statusDisponible',
    bodyKey: 'registroPersonalBody',
  },
  {
    nameKey: 'kpis',
    status: 'próximamente',
    statusLabelKey: 'statusProximamente',
    bodyKey: 'kpisBody',
  },
  {
    nameKey: 'asistencia',
    status: 'próximamente',
    statusLabelKey: 'statusProximamente',
    bodyKey: 'asistenciaBody',
  },
  {
    nameKey: 'auditoria',
    status: 'próximamente',
    statusLabelKey: 'statusProximamente',
    bodyKey: 'auditoriaBody',
  },
]

export const FAQ = [
  { questionKey: 'faq1Question', answerKey: 'faq1Answer' },
  { questionKey: 'faq2Question', answerKey: 'faq2Answer' },
  { questionKey: 'faq3Question', answerKey: 'faq3Answer' },
]
