// Developer Manual -- diccionario de datos real y arquitectura (MI Stack
// Reference, sección 14d, HARD RULE). Contenido separado de la
// presentación (DeveloperManualPage.jsx) para que la migración a
// Tailwind (fase futura) solo toque el renderer, nunca este contenido.
// Fuente de verdad: server-lib/db/schema.ts -- si el schema cambia, este
// archivo debe actualizarse en el mismo PR (no hay generación automática
// todavía).

export const ARCHITECTURE_OVERVIEW = `
Centro de Trabajo FFT es una app de gestión de personal de piso de
producción: quién está asignado a qué estación hoy, historial de
movimientos, asistencia, importación de la plantilla oficial (Excel) y
permisos por rol/módulo.

Stack actual: React 18 + Vite (JS, tsconfig permisivo desde la Fase 1 de
compliance) + MUI + Drizzle ORM sobre Postgres (Neon) + autenticación
propia por cookie firmada (JWT) + despliegue automático en Vercel
(GitHub → Preview en cada push a desarrollo-personal, Producción en cada
push a main).

Capa de datos (server-lib/db/): schema.ts + relations.ts se generaron con
"drizzle-kit introspect" directo contra la base real (nunca escritos a
mano) -- 18 tablas/12 enums. client.ts exporta "db" (singleton, mismo
patrón que el antiguo cliente Prisma) más cada tabla, para import directo
desde cualquier archivo del servidor. Migrado desde Prisma en la Fase 3 de
compliance (ver CHANGELOG.md) -- mismo comportamiento de negocio,
verificado archivo por archivo.

Frontend (src/): páginas por módulo en src/pages/<modulo>/, estado de
sesión en src/state/auth.jsx, capa de datos de personal en
src/data/personnel/ y src/data/production/ (catálogo de áreas/turnos,
snapshot base importado, etc.).

Backend (api/, server-lib/): cada archivo bajo api/**/*.js es una función
serverless de Vercel (ruteo por convención de carpetas, sin config
adicional en vercel.json). server-lib/dev-server.js monta esas mismas
funciones 1:1 sobre Express para desarrollo local
(concurrently "vite" + "node server-lib/dev-server.js"). server-lib/auth.js
concentra autenticación (getSessionUser) y los 3 wrappers de autorización
(requireAuth/requireRole/requireModuleAccess) que envuelven casi todos los
endpoints -- ese es el único chokepoint que Sentry usa para capturar
errores sin tocar cada endpoint por separado.

Scripts de mantenimiento (scripts/*.mjs): migraciones puntuales
idempotentes (soft-delete de estaciones obsoletas, nunca DELETE físico) y
scripts/seed-personnel.mjs, que sincroniza Workstation con el generador
puro src/data/personnel/workstations.js. scripts/verify-line-logic.mjs es
la suite de verificación de lógica pura del proyecto (no hay Vitest/
Playwright todavía) -- se corre después de cualquier cambio a catalog.js/
workstations.js.
`.trim()

export const AUTH_OVERVIEW = `
Autenticación hoy: login por employeeNumber o username (no existe campo
email en el modelo User), contraseña con bcrypt, cookie httpOnly
"fft_session" firmada con JWT (8 horas de sesión). getSessionUser siempre
re-consulta el User real en base de datos en cada request -- nunca confía
en el rol/estado que el token dice tener, solo en el userId.

Migración planeada (ver checklist de credenciales): reemplazo por SSO real
de Nextcloud (OIDC). Los 25 archivos que llaman a requireAuth/requireRole/
requireModuleAccess NO cambian con esa migración -- solo cambia cómo se
puebla req.user en api/auth/login.js y api/auth/session.js.
`.trim()

// Cada modelo: nombre, propósito en 1 línea, y campos reales (nombre, tipo
// Prisma, notas). Los enums se listan aparte para no repetirlos por modelo.
export const DATA_DICTIONARY = [
  {
    model: 'User',
    purpose: 'Cuenta de acceso al sistema (login) -- separada por completo de Employee.',
    fields: [
      ['id', 'String (cuid)', 'PK'],
      ['employeeNumber', 'String?', 'único, uno de los dos identificadores de login'],
      ['username', 'String?', 'único, el otro identificador de login'],
      ['name', 'String', ''],
      ['passwordHash', 'String', 'bcrypt, nunca se expone al cliente (ver publicUser())'],
      ['role', 'UserRole', 'ADMINISTRADOR | SUPERVISOR | LIDER'],
      ['active', 'Boolean', 'false = login bloqueado (403)'],
      ['mustChangePassword', 'Boolean', 'fuerza cambio de contraseña en el próximo login'],
      ['lastLoginAt', 'DateTime?', ''],
      ['employeeId', 'String? (FK Employee)', 'único, opcional -- no todo User es un Employee'],
    ],
  },
  {
    model: 'Employee',
    purpose: 'Catálogo real de personal de piso, alimentado por el import de LAYOUT FFT.xlsx.',
    fields: [
      ['id', 'String (cuid)', 'PK'],
      ['employeeNumber', 'String?', 'único'],
      ['fullName', 'String', ''],
      ['photoUrl', 'String?', ''],
      ['active', 'Boolean', 'false = BAJA -- nunca se le puede registrar/asignar/mover'],
      ['areaZona', 'String?', 'ubicación habitual histórica del snapshot BASE, sin normalizar'],
      ['rawZona', 'String?', 'crudo, tal cual el Excel'],
      ['actividad', 'String?', 'código crudo de actividad del snapshot, sin interpretar'],
      [
        'baseAsistencia',
        'String?',
        'código crudo de asistencia del snapshot BASE (no es Attendance)',
      ],
      ['fechaIngreso', 'String?', 'tal cual "DD/MM/AAAA" de SEM 34, sin parsear'],
      [
        'baselineSuppressed',
        'Boolean',
        'true = nunca se ubica por areaZona hasta tener asignación real',
      ],
    ],
  },
  {
    model: 'ImportBatch',
    purpose: 'Cada corrida de importación de LAYOUT FFT.xlsx -- idempotente por fileHash.',
    fields: [
      ['fileHash', 'String', 'único -- re-subir el mismo archivo nunca duplica nada'],
      ['sheet', 'String', ''],
      ['status', 'ImportBatchStatus', 'RUNNING | COMPLETED | FAILED'],
      [
        'totalRows / newEmployees / updatedEmployees / skippedRows / conflictsFound',
        'Int',
        'contadores del batch',
      ],
      ['triggeredByUserId', 'String (FK User)', ''],
    ],
  },
  {
    model: 'EmployeeImportSource',
    purpose: 'Fila cruda de BASE/BAJAS que originó o actualizó un Employee (trazabilidad).',
    fields: [
      ['sourceSheet', 'String', '"BASE" | "BAJAS"'],
      ['sourceRowNumber', 'Int', ''],
      [
        'rawZona / rawActividad / rawAsistencia / rawPrestamo',
        'String?',
        'crudos, sin interpretar',
      ],
    ],
  },
  {
    model: 'Skill',
    purpose:
      'Catálogo de habilidades/actividades (code = código crudo del Excel: LC, EM, L, PE...).',
    fields: [
      ['code', 'String', 'único'],
      ['description', 'String?', 'null hasta que un admin la documente manualmente'],
      ['active', 'Boolean', ''],
    ],
  },
  {
    model: 'EmployeeSkill',
    purpose: 'Habilidad de un empleado. Retirar una es SIEMPRE soft-delete, nunca DELETE físico.',
    fields: [
      ['level', 'SkillLevel?', 'PUEDE_CUBRIR | INTERMEDIO | EXPERTO'],
      ['source', 'EmployeeSkillSource', 'IMPORTED | MANUAL'],
      ['active', 'Boolean', 'false = retirada'],
      ['addedByUserId / deactivatedByUserId', 'String? (FK User)', ''],
    ],
  },
  {
    model: 'BajaConflict',
    purpose:
      'Cola de revisión admin: posible coincidencia de nombre entre BASE y BAJAS. Nunca se resuelve sola.',
    fields: [
      [
        'status',
        'BajaConflictStatus',
        'PENDING | CONFIRMED_SAME_PERSON | CONFIRMED_DIFFERENT_PERSON | IGNORED',
      ],
      ['bajaFullName / bajaRowNumber', 'String / Int', 'dato crudo de la fila BAJAS'],
    ],
  },
  {
    model: 'EmployeeReconciliationCandidate',
    purpose:
      'Cola de revisión admin: posible duplicado entre un Employee existente y una fila nueva de import.',
    fields: [
      [
        'status',
        'EmployeeReconciliationStatus',
        'PENDING | CONFIRMED_SAME_PERSON | CONFIRMED_DIFFERENT_PERSON | IGNORED',
      ],
      ['candidateFullName / candidateEmployeeNumber', 'String', 'dato crudo de la fila candidata'],
    ],
  },
  {
    model: 'ImportedAttendanceReference',
    purpose:
      'Código crudo de ASISTENCIA (A/F/I/V) tal como venía en el Excel -- SIN relación con Attendance real.',
    fields: [['rawCode', 'String', '"A" | "F" | "I" | "V" tal cual']],
  },
  {
    model: 'Attendance',
    purpose: 'Pase de lista real, generado día a día por la app (no por el Excel).',
    fields: [
      ['date', 'DateTime @db.Date', ''],
      ['shift', 'String', 'default "GENERAL"'],
      ['status', 'AttendanceStatus', 'PRESENTE | AUSENTE | RETARDO'],
      ['registeredByUserId', 'String (FK User)', ''],
    ],
  },
  {
    model: 'WorkArea',
    purpose: 'Área de trabajo física (línea, paletizado, accesorios, etc.).',
    fields: [
      ['code', 'String', 'único, ej. "L1".."L10", "PAL", "ACC"'],
      ['name', 'String', ''],
      ['displayOrder', 'Int', ''],
      ['active', 'Boolean', ''],
    ],
  },
  {
    model: 'Workstation',
    purpose:
      'Puesto físico dentro de un WorkArea. name es el identificador técnico real (usado por DailyAssignment/EmployeeMovement).',
    fields: [
      ['workAreaId', 'String (FK WorkArea)', ''],
      ['name', 'String', 'único por área ([workAreaId, name]) -- identidad técnica real'],
      ['capacity', 'Int', 'default 1'],
      [
        'role',
        'String?',
        'rol base sin sufijo numérico (agrupación/UI, nunca resuelve asignación)',
      ],
      [
        'category',
        'WorkstationCategory?',
        'LIDERAZGO | CALIDAD | PRODUCCION | TECNICO | SUMINISTRO | APOYO',
      ],
      [
        'active',
        'Boolean',
        'false = soft-delete, nunca se borra físico (hay FK real desde el historial)',
      ],
    ],
  },
  {
    model: 'DailyAssignment',
    purpose:
      'Dónde está cada persona HOY. Solo una ACTIVE por empleado/día (índice único parcial).',
    fields: [
      ['employeeId / workstationId', 'FK', ''],
      ['date', 'DateTime @db.Date', ''],
      ['status', 'DailyAssignmentStatus', 'ACTIVE | ENDED'],
      ['endReason', 'AssignmentEndReason?', 'MOVED | RELEASED | SHIFT_END | CORRECTION'],
      ['assignedByUserId / endedByUserId', 'FK User', ''],
    ],
  },
  {
    model: 'EmployeeMovement',
    purpose:
      'Historial de movimientos -- append-only, la API nunca debe exponer UPDATE/DELETE sobre esta tabla.',
    fields: [
      ['fromWorkstationId', 'String? (FK)', 'null si es la primera asignación del día'],
      ['toWorkstationId', 'String (FK)', ''],
      ['movedByUserId', 'FK User', ''],
    ],
  },
  {
    model: 'PendingMove',
    purpose:
      'Solicitud de movimiento hecha por un LIDER, pendiente de aprobación de SUPERVISOR/ADMINISTRADOR.',
    fields: [
      ['status', 'PendingMoveStatus', 'PENDING | APPROVED | REJECTED'],
      ['requestedByUserId / resolvedByUserId', 'FK User', ''],
    ],
  },
  {
    model: 'RoleModulePermission',
    purpose: 'Permiso de un ROL sobre un módulo (dinámico, editable desde Usuarios).',
    fields: [
      ['role', 'UserRole', ''],
      ['moduleKey', 'String', 'ver shared/moduleRegistry.js'],
      ['allowed', 'Boolean', 'default true'],
    ],
  },
  {
    model: 'UserModulePermission',
    purpose:
      'Override individual de un usuario sobre un módulo. ALLOW/DENY gana sobre el permiso del rol.',
    fields: [
      ['userId / moduleKey', 'FK / String', 'único [userId, moduleKey]'],
      ['effect', 'UserPermissionEffect', 'ALLOW | DENY'],
    ],
  },
  {
    model: 'RoleModuleAccess',
    purpose:
      'LEGACY -- reemplazado en la práctica por RoleModulePermission, se conserva sin usar como respaldo histórico.',
    fields: [
      ['role', 'UserRole', 'PK'],
      ['modules', 'String[]', ''],
    ],
  },
]

export const API_MAP = [
  ['/api/auth/{login,logout,session,change-password}', 'Autenticación -- ver AUTH_OVERVIEW'],
  [
    '/api/personnel/*',
    'El grupo más pesado: checkin, move, release, roster, area-history, approve/reject-move, employees, suppress/restore-baseline',
  ],
  [
    '/api/users/*',
    'CRUD de cuentas User + reset-password + permisos individuales (requireModuleAccess("/usuarios"))',
  ],
  [
    '/api/work-areas/[code]/workstations/*',
    'Configuración de puestos por administrador (crear/editar/eliminar/reordenar)',
  ],
  ['/api/role-permissions/*', 'Permisos por rol'],
  ['/api/permissions/modules/[moduleKey]/users', 'Qué usuarios tienen acceso a un módulo'],
  ['/api/dashboard/trends', 'Métricas agregadas para el Dashboard'],
  ['/api/modules', 'Lista de módulos habilitados para el usuario actual (useEffectiveModules)'],
]
