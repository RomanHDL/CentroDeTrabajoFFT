// User Manual -- ayuda real para usuarios finales (MI Stack Reference,
// sección 17a, HARD RULE). Contenido separado de la presentación
// (UserManualPage.jsx). Refleja el estado REAL de cada módulo -- KPI's/
// Asistencia/Auditoría están marcados "próximamente" a propósito, son
// placeholders reales en el código (ComingSoonPage), no se inventa
// funcionalidad que todavía no existe.

export const MODULES = [
  {
    name: 'Dashboard',
    status: 'disponible',
    body: `
Vista general del estado operativo: personas asignadas hoy vs. plantilla
ideal, cobertura por área, movimientos del día, indicadores FFT
(Eficiencia/Demoras/Producción/Cumplimiento) y gráficas de distribución
por turno/área. Es de solo lectura -- para asignar o mover personal, usa
Centro de Trabajo.
    `.trim(),
  },
  {
    name: 'Centro de Trabajo',
    status: 'disponible',
    body: `
El módulo principal. Tres pestañas:

- Estaciones: mapa operativo de todas las WC (Líneas 0-10, Paletizado,
  Accesorios, Insumos, Midea/High Value, Conveyor y áreas de soporte).
  Haz clic en cualquier área para ver el detalle de sus puestos y quién
  los ocupa.
- Personal: buscador de personas y su ubicación actual, con historial de
  movimientos.
- Bajas: personal marcado como baja (ya no forma parte de la plantilla
  activa) -- nunca se borra del sistema, solo se marca inactivo.

Dentro del detalle de cada área puedes: registrar a alguien en un puesto
libre, mover a alguien de puesto, liberar un puesto, y (si tu rol lo
permite) configurar los puestos de esa área. Un LIDER que pide un
movimiento necesita aprobación de un SUPERVISOR o ADMINISTRADOR antes de
que se aplique -- esa solicitud pendiente aparece señalada hasta que se
resuelve.
    `.trim(),
  },
  {
    name: 'Usuarios',
    status: 'disponible',
    body: `
Solo visible para quien tiene el módulo "Usuarios" habilitado (típicamente
ADMINISTRADOR). Crear/editar/desactivar cuentas, restablecer contraseñas,
y configurar qué módulos puede ver cada rol o cada persona en particular
(los overrides individuales ganan sobre el permiso general del rol).
    `.trim(),
  },
  {
    name: 'Registro de personal',
    status: 'disponible',
    body: `
Pantalla pensada para check-in rápido en tablet/piso: buscar a una persona
y asignarla a un puesto libre en pocos toques, sin pasar por el detalle
completo de Centro de Trabajo.
    `.trim(),
  },
  {
    name: "KPI's",
    status: 'próximamente',
    body: 'Módulo en construcción -- todavía no tiene funcionalidad propia.',
  },
  {
    name: 'Asistencia',
    status: 'próximamente',
    body: 'Módulo en construcción -- todavía no tiene funcionalidad propia.',
  },
  {
    name: 'Auditoría',
    status: 'próximamente',
    body: 'Módulo en construcción -- todavía no tiene funcionalidad propia.',
  },
]

export const FAQ = [
  [
    '¿Por qué no puedo ver un módulo que antes sí veía?',
    'Un ADMINISTRADOR puede cambiar en cualquier momento qué módulos ve tu rol o tu cuenta específicamente, desde Usuarios → Gestión de permisos. Si crees que es un error, pide que lo revisen ahí.',
  ],
  [
    '¿Qué significa que a alguien le falte "estación"?',
    'Pasa cuando la estación donde estaba asignada esa persona ya no existe en la configuración actual del área (por ejemplo, un administrador la eliminó o renombró). La persona nunca desaparece del sistema -- aparece en "Personal sin estación" hasta que alguien la reasigne a un puesto real.',
  ],
  [
    '¿Se puede deshacer un movimiento?',
    'El historial de movimientos nunca se borra ni se edita (es un registro permanente). Para corregir una ubicación, simplemente se hace un nuevo movimiento -- el sistema no "reescribe" el pasado.',
  ],
]
