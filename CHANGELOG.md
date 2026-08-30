# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado [semver](https://semver.org/lang/es/) (`package.json`).

## [Unreleased] — migración a MI Stack Reference

Cumplimiento real (no tokenístico) con el estándar interno de la empresa
para poder desplegar en el servidor privado (Coolify). Ver
`src/pages/docs/DeveloperManualPage.jsx` para el detalle de arquitectura.

### Added
- pnpm pinneado (`packageManager: pnpm@11.22.0`), reemplaza npm.
- Biome como linter/formateador (2 espacios, ancho 100, preset "recommended").
- `tsconfig.json` permisivo (`allowJs`) — código nuevo se escribe en TypeScript
  real desde ahora; el `.jsx` existente se convierte de forma oportunista.
- Observabilidad Sentry (frontend + backend), inactiva hasta recibir un DSN real.
- Developer Manual (`/developer-manual`, solo ADMINISTRADOR) y Manual de
  Usuario (`/manual`), ambos enlazados desde el menú de navegación.
- Este `CHANGELOG.md`, ahora también visible dentro de la app en `/changelog`.
- **Migración completa Prisma → Drizzle ORM.** Schema (`server-lib/db/schema.ts`
  + `relations.ts`) generado por introspección directa contra la base real
  (18 tablas/12 enums, cero riesgo de definición divergente). Los 25 archivos
  `api/*`/`server-lib/*` y los 11 scripts de mantenimiento que usaban Prisma
  fueron portados uno por uno, mismo comportamiento verificado (transacciones
  con `FOR UPDATE`, claves compuestas, upserts, joins anidados). `@prisma/*`
  y `prisma` eliminados de las dependencias; `prisma/`, `prisma.config.js`,
  `server-lib/prisma.js` y `generated/` eliminados del repo.
- **i18n real (react-i18next).** Framework completo más extracción de TODO
  el texto visible de la app (Centro de Trabajo, dashboard, usuarios,
  registro de personal, docs, y la capa de lógica de negocio/catálogos
  compartidos) a claves de traducción, con contenido REAL (no placeholders)
  en español, inglés y chino simplificado en los 13 namespaces. Selector de
  idioma persistente (localStorage), español como idioma por defecto.
- **Migración completa MUI → Tailwind CSS + shadcn/ui.** Los 88 archivos del
  frontend convertidos uno por uno; MUI eliminado por completo de las
  dependencias del proyecto.

### Changed
- Formato de código en todo el repo (Biome), sin cambios de comportamiento.

### Pending (bloqueado en credenciales externas — ver checklist entregado al usuario)
- SSO real de Nextcloud (OIDC), reemplaza el login propio.
- Despliegue a Coolify (Docker + PM2), reemplaza Vercel.

## [1.0.0]

Estado de producción antes de iniciar la migración de stack. Gestión
completa de personal de piso: asignación diaria por estación, movimientos
con aprobación (LIDER → SUPERVISOR/ADMINISTRADOR), asistencia, catálogo de
personal importado desde Excel (con colas de revisión para conflictos de
baja/duplicados), permisos por rol y por usuario, y un plano operativo 2D
del piso (WC Líneas 0-10, Paletizado, Accesorios, Insumos, Midea/High
Value, Conveyor). Desplegado en Vercel con integración automática de
GitHub (`desarrollo-personal` → Preview, `main` → Producción).
