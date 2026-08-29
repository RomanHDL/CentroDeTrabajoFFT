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
- Developer Manual (`/developer-manual`) y Manual de Usuario (`/manual`).
- Este `CHANGELOG.md`.
- **Migración completa Prisma → Drizzle ORM.** Schema (`server-lib/db/schema.ts`
  + `relations.ts`) generado por introspección directa contra la base real
  (18 tablas/12 enums, cero riesgo de definición divergente). Los 25 archivos
  `api/*`/`server-lib/*` y los 11 scripts de mantenimiento que usaban Prisma
  fueron portados uno por uno, mismo comportamiento verificado (transacciones
  con `FOR UPDATE`, claves compuestas, upserts, joins anidados). `@prisma/*`
  y `prisma` eliminados de las dependencias; `prisma/`, `prisma.config.js`,
  `server-lib/prisma.js` y `generated/` eliminados del repo.

### Changed
- Formato de código en todo el repo (Biome), sin cambios de comportamiento.

### Pending (bloqueado en credenciales externas — ver checklist entregado al usuario)
- Andamiaje i18n (en / es-MX / zh-CN).
- SSO real de Nextcloud (OIDC), reemplaza el login propio.
- Migración MUI → Tailwind CSS + shadcn/ui.
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
