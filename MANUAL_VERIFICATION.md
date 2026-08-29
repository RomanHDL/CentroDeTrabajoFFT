# Checklist de verificación manual

Este proyecto no tiene suite de pruebas automatizadas (no hay Vitest/
Playwright configurados todavía). Hasta que exista una, cada cambio —
especialmente cada fase de la migración a MI Stack Reference — se
verifica así, en este orden:

## 1. Verificación de código

```
pnpm build                                                    # build de producción sin errores
pnpm exec tsc --noEmit                                        # tsconfig no rompe (permisivo)
node --import ./scripts/_esm-extensionless-loader.mjs \
  scripts/verify-line-logic.mjs                                # lógica pura de WC LINEA/turnos/etc.
```

Cualquier fase que toque `src/data/personnel/workstations.js` o
`src/data/production/catalog.js` (estaciones, roles, turnos) **debe**
dejar `verify-line-logic.mjs` en verde antes de continuar.

## 2. Preview de Vercel antes de tocar `main`

Todo push a `desarrollo-personal` genera un Preview automático. Antes de
promover a `main` (producción real), recorrer manualmente en el Preview:

- [ ] Login funciona (o el flujo de auth vigente en esa fase).
- [ ] Dashboard carga sin errores en consola.
- [ ] Centro de Trabajo: abrir una WC LINEA, ver personal asignado real.
- [ ] Registrar/mover a una persona de prueba (deshacer el cambio después).
- [ ] Usuarios: la lista carga, permisos se ven correctos para tu rol.
- [ ] Modo oscuro/claro sigue funcionando.
- [ ] Sidebar abre/cierra igual que antes (hover en desktop, drawer en touch).
- [ ] Sin errores nuevos en Sentry (si ya hay DSN configurado) durante el recorrido.

## 3. Para cambios en el modelo de datos (Prisma/Drizzle)

- [ ] Comparar el resultado de una query representativa (roster, employees)
      entre el cliente viejo y el nuevo contra la MISMA branch de Neon.
- [ ] Confirmar que ningún script de `scripts/*.mjs` quedó roto (correrlos
      contra una branch de prueba, nunca contra producción directamente).

## 4. Para cambios de autenticación

- [ ] Login con una cuenta real de prueba, no solo con datos de mentira.
- [ ] Confirmar que el mecanismo de login anterior sigue disponible como
      respaldo (toggle) hasta que el nuevo esté probado en producción real
      por al menos unos días.

## 5. Para cambios visuales (MUI → Tailwind)

- [ ] Comparación lado a lado contra producción: spacing, dark mode,
      responsive, estados hover/active/disabled.
- [ ] Para `centro-trabajo/`, idealmente que un supervisor real de piso
      haga un recorrido en el Preview antes de promover a `main`.

## 6. Antes de cada push a `main`

Nunca cortar el login actual ni la API en producción sin un camino de
rollback inmediato (toggle de feature flag, o revert de un solo commit).
