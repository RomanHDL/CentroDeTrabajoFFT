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
- **Despliegue a Coolify (Fase 7).** `ecosystem.config.cjs` (PM2 en modo
  `pm2-runtime`) + `server-lib/prod-server.js` (Express, bind a `0.0.0.0`,
  puerto desde `process.env.PORT`) como entrypoint real fuera de Vercel.
  Repo espejo `mi2-apps/centro-de-trabajo` corriendo en vivo en
  `https://centro-de-trabajo.mi2.com.mx` desde el 2026-09-01 (fix de
  `NIXPACKS_START_CMD` para que la fase `start` use la ruta completa de
  pnpm, mismo problema que ya afectaba a `build`).
- **Sincronización automática de personal.** `server-lib/personnel-sync.js`
  corre cada 30 minutos en producción: altas y bajas reales de SmartControl
  se reflejan solas en el catálogo de Empleados, sin captura manual.
- **Manuales de proceso reales.** Extraídos con imágenes del manual oficial
  y embebidos directamente en "Hoja de Proceso" (Centro de Trabajo) para
  Prueba eléctrica, Limpieza de TV, Empaque y Etiquetado.
- **Auditoría de 5'S completa.** Checklist real de 40 criterios (5
  categorías), radar de resultados, historial y evolución mensual por área
  (`FiveSAudit`/`FiveSAuditAnswer`).
- **Auditoría de Proceso.** Checklist real de 28 criterios para el puesto de
  Etiquetado (tomado del formato de Calidad), empleado autocompletado desde
  quien está asignado a esa estación hoy, puntaje por categoría calculado en
  servidor (`ProcessAudit`/`ProcessAuditAnswer`).
- Manual de proceso real (SOP oficial de Calidad,
  `SOP-MTY-FFT-QA-001_v1.0.0.pdf`) embebido en "Hoja de Proceso" para el
  puesto de Calidad en todas las WC LINEA.
- Dos módulos nuevos en el menú — Demoras y Planeación — marcados "En
  desarrollo", solo navegación por ahora (mismo patrón que KPI's/
  Asistencia/Auditoría cuando se agregaron).
- Módulo nuevo Organigrama (`/organigrama`, M · Personal) — solo navegación
  por ahora, marcado "En desarrollo" (mismo patrón mínimo que Demoras/
  Planeación).
- **Demoras — registro real de tiempo muerto.** Deja de ser "En desarrollo":
  catálogo real de 14 causas (Espera, Falla de sistemas/Internet, Falla en
  máquina, Falta de materiales/accesorios/cushion/protector/bolsas/
  herramientas, Defectos, Calificaciones distintas, Duplicado, Modelo, ver
  `src/data/demoras/catalog.js`), formulario de registro (área/línea →
  estación → causa → duración → turno → nota) e historial con badge
  "Reportable" para demoras de 4 minutos o más. Tabla nueva `DowntimeRecord`
  (migración `drizzle/0008_add_downtime_record.sql`) + `GET`/`POST
  /api/demoras`. Fuera de alcance (confirmado explícitamente): no existe un
  bloqueo técnico de "no clasificar la siguiente TV" — esa acción vive en
  SmartControl/BinManager, sistema externo de solo lectura desde este repo;
  la regla queda como política de proceso del supervisor.
- **Módulo nuevo Control de Equipo.** Registro real de estado de equipo
  físico (impresoras, pistolas de calor/cushion, tablets, radios, escáner,
  máquina de cinta café, flejadora, patín — ver
  `src/data/controlEquipo/catalog.js`), formulario (tipo → área/línea →
  estación → identificador → estado → nota) e historial con badge de
  estado (Operativo/Dañado/En reparación/De baja). Tabla nueva
  `EquipmentItem` (migración `drizzle/0009_add_equipment_tables.sql`) +
  `GET`/`POST /api/control-equipo`.
- **"Levantamiento de Equipo" en Auditoría.** Tercer tipo de auditoría
  (junto a 5'S y Auditoría de Proceso): checklist real de los 9 tipos de
  equipo físico de Control de Equipo, respondido Cumple/Cumple
  parcial/No cumple por equipo, con resultado inmediato (puntaje sobre
  18). Tablas nuevas `EquipmentAudit`/`EquipmentAuditAnswer` + `GET`/`POST
  /api/equipment-audits`.
- **Widget "Problemas en planta" en el Dashboard.** Al fondo del Dashboard,
  resume en vivo los datos de hoy de Demoras y Control de Equipo — tiempo
  muerto total, demoras reportables (4+ min), demoras por falta de
  material/accesorios/herramientas, y equipo con problema reportado.
  "Línea saturada" no se incluye — no existe todavía una métrica real de
  capacidad/utilización en el sistema, no se inventa.
- **Módulo nuevo Hora por Hora** (reescrito 2026-09-04 para reproducir
  EXACTAMENTE el formato del Excel real de control de producción entregado
  por el usuario, "Hora_por_Hora_FFT_7a5.xlsx"). Digitaliza el formato
  físico "Hora por Hora": estándar vs. real por bloque de una hora (turno
  reutilizado de `OFFICIAL_SHIFTS`, incluyendo turnos que cruzan
  medianoche), GAP y cumplimiento calculados siempre por el sistema, estado
  por hora con resaltado sutil de la hora activa ("En proceso"). Captura
  tipo hoja de cálculo directamente en la tabla (clic, escribir, Enter pasa
  a la hora siguiente, Tab avanza de columna) con guardado automático por
  campo (debounce, sin botón "Guardar"), pérdidas por causa + Observaciones
  en una sola unidad Piezas o Minutos por turno (nunca mezcladas), con
  Total pérdidas y fila TOTAL TURNO automáticos. Columnas Hora/Estándar/
  Real/GAP/Cumplimiento fijas (sticky) al hacer scroll horizontal en
  tablet. KPIs y gráfica de acumulado muestran progreso hasta la hora en
  curso (nunca el turno completo mientras aún faltan horas); "Resumen del
  turno" y el Excel sí muestran el turno completo. Gráfica de pérdidas por
  causa, histórico de turnos con detalle hora por hora de solo lectura,
  exportación a Excel (2 hojas: Hora por Hora/Resumen, mismo layout que el
  Excel original), y "Finalizar turno"/"Reabrir turno" con confirmación
  (nunca automático). El rate estándar se congela por hora al capturar —
  cambiarlo después nunca altera el histórico.
  **Causas de pérdida por área** (2026-09-04 v2, a petición explícita del
  usuario -- "cada área tiene sus paros, no todas las áreas son iguales...
  yo pongo el catálogo de cada área"): el catálogo de causas ya NO es un
  set fijo de 11 columnas para todas las áreas -- cada grupo de área
  (Líneas de producción/Insumos/Accesorios/Midea/Paletizado) tiene su
  propio catálogo independiente, editable por un ADMINISTRADOR desde
  "•••" → "Configurar causas" (crear, renombrar, activar/desactivar,
  reordenar -- nunca eliminar físicamente una causa con histórico). Líneas
  de producción se sembró con las mismas 11 causas de la versión anterior
  para no cambiar su comportamiento por defecto; Insumos/Accesorios/Midea/
  Paletizado empiezan sin causas -- el administrador define las suyas
  (p. ej. Insumos/Accesorios no son producción, entregan materiales/
  accesorios a las líneas, así que sus paros reales son distintos). Tablas
  `HourlyProductionSession`/`HourlyProductionEntry` + `HourlyProductionDowntimeCause`/
  `HourlyProductionIncident` (migraciones
  `drizzle/0010_add_hourly_production.sql`,
  `drizzle/0011_hourly_production_fixed_losses.sql` y
  `drizzle/0013_hourly_dynamic_causes.sql`) + endpoints bajo
  `/api/hora-por-hora/*`.
- **Módulo nuevo Sorting** (mismo formato exacto que Hora por Hora, a
  petición explícita del usuario — "es un módulo distinto", no una vista
  alterna del mismo). Mismas fórmulas/lógica de captura (compartidas vía
  `src/data/shiftProduction/`), pero identidad, tablas
  (`SortingSession`/`SortingEntry`, migración `drizzle/0012_add_sorting.sql`),
  ruta (`/sorting`) y permiso completamente separados de Hora por Hora —
  cero acceso automático para ningún rol hasta que un ADMINISTRADOR lo
  otorgue explícitamente, igual que cualquier módulo nuevo. A diferencia de
  Hora por Hora (que aplica a cualquier área/línea del catálogo de
  producción), Sorting **no tiene selector de área/línea**: es una sola área
  fija, a petición explícita del usuario ("Sorting es un área") — sin
  filtro de área en el histórico ni columna de área en la tabla o el Excel.
- **Eliminar usuario permanentemente (solo empleado 3647).** Nueva acción
  "Eliminar" en Usuarios del sistema (`api/users/[id].js`, método DELETE,
  ruta registrada en `server-lib/api-routes.js`): borra la fila real de
  la tabla `User` en la base de datos, no una desactivación. Autorización
  hardcodeada -- únicamente `req.user.employeeNumber === '3647'` puede
  llamarlo, sin importar el rol de quien más sea ADMINISTRADOR después (a
  petición explícita del usuario, "solo yo 3647 pueda eliminar usuarios").
  No se puede eliminar la propia cuenta. En el cliente
  (`UsuariosPage.jsx`) el botón solo aparece para ese mismo usuario, y el
  diálogo de confirmación exige escribir el número de empleado (o
  username) exacto antes de habilitar "Eliminar definitivamente" — la
  autorización real vive en el servidor, ocultar el botón es solo UX.
  Si el usuario tiene registros históricos con `onDelete:'restrict'`
  (auditorías, demoras, equipo, etc.) el borrado se rechaza con un error
  claro (409) en vez de perder ese historial o intentar un cascade
  automático. Probado en vivo con un usuario descartable (creado y
  eliminado de punta a punta, confirmado con recarga completa que ya no
  existe en la base de datos).
- **Vincular a cuenta existente (Solicitudes de acceso SSO).** Nueva
  acción en `AccessRequestsCard.jsx`/`api/access-requests/[id]/decide.js`
  (`action='link'`): cuando alguien con cuenta local de siempre (creada
  antes de tener SSO configurado) inicia sesión por primera vez con
  Nextcloud, cae en "Solicitar acceso" como si fuera nuevo porque su
  cuenta nunca tuvo `oidcSub` -- "Aprobar" SIEMPRE creaba un `User`
  nuevo, dejando una cuenta duplicada para la misma persona. Ahora se
  puede elegir "Vincular a cuenta existente" y seleccionar de un
  desplegable de usuarios reales: hace `UPDATE` de `oidcSub` sobre ESE
  usuario en vez de insertar uno nuevo (rechaza con 409 si esa identidad
  ya está vinculada a otra cuenta, vía `pgError()`). Encontrado y resuelto
  a partir del caso real del propio administrador (Roman, cuenta 3647).
  Verificado en vivo de punta a punta con datos de prueba desechables, y
  usado de inmediato para vincular la cuenta real.
- **Solicitudes de acceso SSO en la campana de notificaciones.** A
  petición explícita del usuario ("si alguien quiere iniciar sesión me
  va a aparecer ahí para aceptar o rechazar?"): antes SOLO vivían en
  Usuarios > Solicitudes de acceso SSO, invisibles hasta entrar a esa
  pantalla -- la campana (`NotificationBell.jsx`) solo avisaba
  Movimientos de área. Ahora agrega una segunda sección con el mismo
  aprobar/vincular/rechazar completo, en una fila apilada verticalmente
  para el ancho angosto del popover (320px). La fila real
  (`AccessRequestDecideRow.jsx`) se extrajo de `AccessRequestsCard.jsx`
  para que ambos la compartan tal cual -- nunca dos copias de esa
  lógica que se puedan desincronizar. Consulta cada 30s (`/api/access-
  requests?status=PENDING`, sin sync en vivo como Movimientos de área,
  que sí necesita esa latencia para el piso de producción -- un login
  SSO nuevo es raro, no urgente). Visible solo para quien tenga acceso
  efectivo al módulo Usuarios (mismo gate que ya exige el servidor en
  `decide.js`, no solo el rol) -- a petición explícita del usuario,
  "que esas notificaciones solo me lleguen a mí". Verificado en vivo con
  una solicitud de prueba: aparece en la campana, se puede rechazar
  desde ahí, y el contador se actualiza solo.
- **Solicitud de acceso LOCAL (segundo origen, alterno a SSO).** A
  petición explícita del usuario ("que salte un mensaje de que no estás
  registrado... botón de mandar solicitud... me llegue el número de
  empleado en automático"): si alguien intenta el login local (número de
  empleado/contraseña) con un número que no tiene cuenta todavía,
  `api/auth/login.js` ya no devuelve un error muerto -- responde
  `404 {error, code:'NOT_REGISTERED'}` (tradeoff de seguridad conocido y
  aceptado explícitamente: revela que el número no existe, aceptable
  porque es un identificador interno, no un email de terceros).
  `LoginPage.jsx` ofrece ahí mismo "Enviar solicitud de acceso" ->
  `api/auth/request-access.js` (nuevo, sin sesión, re-valida en el
  servidor). Llega a Usuarios > Solicitudes de acceso Y a la campana de
  notificaciones, con el número de empleado ya listo -- el admin solo
  agrega nombre, rol y una contraseña real al aprobar
  (`mustChangePassword=true`, nunca la contraseña aleatoria que sí usan
  las cuentas SSO). Requirió migración real (`drizzle/0014_access_
  request_local_signup.sql`, aditiva): `AccessRequest.oidcSub`/`email`
  pasan a nullable, nueva columna `AccessRequest.employeeNumber`.
  `decide.js`/`AccessRequestDecideRow.jsx` distinguen el origen LOCAL vs
  SSO por cuál de los dos campos viene lleno (nunca un campo `source`
  aparte) -- oculta "Vincular a cuenta existente" para solicitudes
  locales (no hay nada que vincular, es alguien nuevo de verdad).
  Verificado en vivo de punta a punta con datos de prueba desechables:
  login real con el número/contraseña nuevos, redirigido correctamente a
  cambiar contraseña; ambos registros de prueba limpiados por completo
  al terminar.

### Changed
- Formato de código en todo el repo (Biome), sin cambios de comportamiento.
- Rediseño compacto de las cards "Estado general del día"/"Directorio
  rápido de personal"/"Alertas y pendientes" en el módulo de Personal.
- La Auditoría 5'S vuelve a ser "por área" (sin puesto/empleado), con un
  campo Auditor visible que muestra el usuario de la sesión real.
- Líneas sin personal asignado ahora se ven en amarillo (antes gris/rojo),
  tanto en la pestaña Líneas como en el tablero Área operando.
- **Sidebar reorganizado por categorías.** El menú lateral ahora se genera
  dinámicamente desde `shared/moduleRegistry.js`
  (`src/layout/navigationConfig.js`) en vez de una lista fija en el
  componente — agregar un módulo nuevo con su `group`/`order` ya no requiere
  tocar el JSX del sidebar.
- **Metodología PQCDSM.** El menú lateral reagrupa los módulos operativos de
  planta en las 6 familias de PQCDSM — Productividad/Calidad/Costos/
  Entrega/Seguridad/Personal —, cada una con una insignia chica de letra y
  color propio (azul/verde/ámbar/morado/rojo/turquesa) junto al título;
  Administración/Recursos/Sistema se quedan como secciones de soporte, sin
  insignia. Una categoría PQCDSM sin módulos reales asignados (hoy Costos/
  Entrega/Seguridad) simplemente no aparece — se activa sola en cuanto se
  registre el primer módulo de esa familia, sin tocar el sidebar. El
  clasificador automático (`inferNavigationGroup`, usado solo cuando un
  módulo no trae `group` explícito) se reescribió con palabras clave por
  familia y una regla exacta dedicada para variantes de "organigrama".
- **Organigrama se mueve a Visión General.** Al ser una vista transversal
  de toda la planta (no una familia PQCDSM), Organigrama pasa de M ·
  Personal a Visión General, justo debajo de Dashboard — Registro de
  personal y Asistencia se quedan sin cambios en M · Personal. La regla
  exacta y las palabras clave de "organigrama"/variantes en el
  clasificador automático apuntan ahora a Visión General.
- **Evaluaciones se mueve a M · Personal.** Pasa de Q · Calidad a M ·
  Personal, en el hueco que dejó Organigrama al moverse a Visión General.
- Dos módulos nuevos en Q · Calidad — Rechazo Interno y PPM's Interno —
  marcados "En desarrollo", solo navegación por ahora (mismo patrón que
  Demoras/Planeación/Organigrama). Serán registros/catálogo de retrabajo
  reflejados a futuro en los KPI's de Calidad (PPM's INTERNOS,
  RETRABAJOS); esa integración con los KPI's reales es trabajo aparte, no
  incluido en esta entrega.
- **Demoras — vista por rol.** El rol LIDER ahora solo ve el formulario
  "Registrar demora", sin el historial de "Registros recientes" (ni se
  pide al servidor para ese rol). ADMINISTRADOR/SUPERVISOR sin cambios.
- **Demoras renombrado a "Demoras de trabajo".** Cambia el nombre visible
  en el menú lateral, el título de la página y el registro de módulos
  (`shared/moduleRegistry.js`) — la ruta (`/demoras`) y todo lo demás no
  cambian.
- **Demoras — se quita el campo Estación.** El formulario de "Registrar
  demora" ya no pide Estación en ninguna de las 5 áreas; el campo se
  elimina de la UI y del payload enviado al servidor (`stationName` sigue
  existiendo como columna opcional en la base de datos, para no perder los
  registros históricos que sí la tenían).
- **Selector de Línea — orden ascendente 0 a 10.** El dropdown "Línea" que
  comparten Demoras, Hora por Hora, Auditoría y Control de Equipo ahora
  muestra WC LINEA 0, 1, 2... 10 en vez de 1..10 seguido de 0 al final
  (nuevo export `LINE_FAMILY_WORK_CENTERS` en
  `src/data/production/catalog.js`, ya ordenado, para no repetir el mismo
  sort en cada pantalla).
- **Demoras — Turno automático.** El campo Turno del formulario ya no
  parte de un valor fijo (`CURRENT_SHIFT='Matutino'` de siempre) -- se
  autocalcula con `getCurrentShift()`/`OFFICIAL_SHIFTS`, la misma
  detección real por hora que ya usan Hora por Hora y Sorting (Matutino
  07:00-17:10, Tiempo extra 17:11-22:00, Noche 22:01-07:00). Sigue siendo
  un select editable por si se registra una demora fuera de su horario
  real. Se guarda como `shift.id` (MATUTINO/TIEMPO_EXTRA/NOCHE); el
  historial muestra tanto los registros nuevos como los antiguos
  (literal legacy Matutino/Vespertino/Nocturno) con su nombre correcto.
- **Demoras — se quita también la columna Estación del historial.** El
  "Registros recientes" ya no muestra la columna Estación (el dato ya no
  se captura desde el formulario, ver entrada anterior de este mismo
  Changelog).
- **Modo claro/oscuro persiste entre sesiones.** Antes `App.jsx` siempre
  arrancaba en `mode='light'` sin importar lo último elegido. Ahora se
  guarda en `localStorage` (`fft_theme`, mismo patrón que `fft_language`
  en `i18n.js`) y se restaura solo al volver a entrar -- igual que ChatGPT
  o Facebook. Un script inline en `index.html` aplica la clase `dark` ANTES
  de que cargue React, para evitar el parpadeo de un instante en claro.
  El idioma ya persistía desde antes (`i18n.js`, sección 10 del MI Stack
  Reference) -- no se tocó, solo se confirmó que sigue funcionando.
- **Centro de Trabajo — Estaciones y Líneas ahora coinciden.** Se
  quitaron las tarjetas "WC Calidad" y "WC Entrenador" de la pestaña
  Estaciones (`EstacionesTab.jsx`) -- ninguna de las dos vive en el
  plano físico (`layoutZones.js`/`OperatingFloorPlan`), así que no
  debían aparecer ahí. La pestaña Líneas (`LineasTab.jsx`) ya no filtra
  con el `hasLineStations()` de siempre (que excluía PROYECTO/WC LINEA
  0) -- ahora usa `LINE_FAMILY_WORK_CENTERS` (catalog.js), la misma
  fuente ya ordenada 0..10 que usan Demoras/Hora por Hora/Auditoría/
  Control de Equipo para su selector de "Línea": son 11 líneas, no 10.
  El badge "Líneas 1 - 10" de la tarjeta FFT en Estaciones cambia a
  "Líneas 0 - 10" para que coincida. Verificado en vivo: ambas pestañas
  ahora muestran los mismos totales (43/92 personal, 46.7% cobertura).
- **Estaciones — "WC Coordinador de Almacén" pasa a "WC GERENTE DE
  FFT".** Renombre visual únicamente (`estacionesTab.areaGerenteName`
  en centroTrabajo.json, id interno `GERENTE` sin cambios). El resto de
  la app ya mostraba "WC GERENTE DE FFT" desde el 2026-09-01 (ver
  `wcCoordinadorAlmacen` en catalog.json/nameKey de `GERENTE` en
  catalog.js) -- solo el texto propio y curado de esta pestaña
  (`buildAreaSlots()`, independiente del catálogo) se había quedado con
  el nombre anterior.
- **Logo real por tema (light/dark).** `BrandLogo.jsx` usa dos assets
  oficiales reales por variante (`centro-control-full.png`/
  `-full-dark.png`, `centro-control-icon.png`/`-icon-dark.png`),
  mostrados/ocultados con las mismas clases `dark:` de Tailwind que ya usa
  toda la app — nunca un filtro CSS (invert/brightness) sobre el logo
  claro. El asset dark se preparó quitándole su fondo sólido horneado (no
  traía canal alfa) para dejarlo transparente de verdad, mismo criterio
  con que ya se recortó el icono actual de la imagen oficial. El parche
  anterior que pintaba de blanco toda la franja del header del sidebar en
  modo oscuro ya no hace falta -- se retira.
- Se quita el logo de marca general del header propio de Centro de Trabajo
  -- el sidebar ya lo trae siempre disponible, mostrarlo también ahí era
  redundante. El módulo sigue llamándose "Centro de Trabajo", sin cambios.
- "Personal por área" (Asistencia) ya no muestra Calidad, WC Gerente de FFT
  ni WC Supervisor como tarjetas propias.
- **Logo real definitivo.** Se usa la imagen oficial COMPLETA (icono +
  "Centro de Control" + "CONTROL OPERATIVO", todo dibujado dentro de la
  imagen) como un solo asset en login, sidebar y encabezado propio de
  Centro de Trabajo — nunca icono + texto HTML por separado
  (`public/branding/centro-control-full.png`). El favicon usa solo el
  isotipo, recortado de la misma imagen oficial
  (`centro-control-icon.png`). Se quita el logo redundante de la barra
  superior compacta (el sidebar, siempre visible al fijarlo/pasar el
  mouse, ya lo trae). En modo oscuro, el header del sidebar se pinta como
  una franja blanca completa (logo + botón de expandir) en vez de una
  caja ajustada solo a la imagen — el logo está diseñado para fondo
  blanco, esta franja lo trata como marca propia en vez de forzarle un
  fondo oscuro que no es el suyo.
- **Login local y Nextcloud ahora conviven, en vez de que uno reemplace
  al otro.** Revierte la decisión anterior del 2026-09-02 ("Nextcloud
  reemplaza el login local, así es en Cubicaje") -- a petición explícita
  del usuario, viendo el caso real de agregar gente de planta que nunca
  tendrá cuenta de Nextcloud. `LoginPage.jsx`: el formulario de número de
  empleado/contraseña se pinta siempre de inmediato (ya no espera la
  respuesta de `/api/auth/oidc/status`); si el servidor confirma las 4
  credenciales reales, se agrega debajo un divisor ("o") + el botón
  "Iniciar sesión con Nextcloud". Número de empleado = producción,
  Nextcloud = oficina/sistemas/supervisores. Verificado visualmente en
  vivo en ambos modos (solo local, y local + Nextcloud).
- **Vercel redirige todo su tráfico a Coolify.** Con los dos métodos de
  login conviviendo en la misma página (ver entrada anterior), ya no
  hace falta que nadie use el deploy de Vercel directo -- Coolify cubre
  100% de los casos (planta y oficina). `vercel.json`: nuevo `redirects`
  que manda cualquier ruta al dominio real
  (`https://centro-de-trabajo.mi2.com.mx/$1`), `permanent: false` (307,
  reversible fácil si algún día hace falta usar Vercel de respaldo).
  Motivo real: las sesiones de login son por dominio aunque ambos
  deploys compartan la misma base de datos -- sin este redirect, alguien
  podía terminar logueado en Vercel sin sesión en Coolify (o viceversa),
  justo la confusión que el usuario quería evitar al agregar gente
  nueva.
- **Nextcloud vuelve a ser el método principal/visible del login.** A
  petición explícita del usuario, revierte (parcialmente) la entrada de
  ayer: ya NO reemplaza al login local (eso sigue igual, corregido el
  2026-09-07), pero tampoco se muestran los dos siempre juntos --
  `LoginPage.jsx` muestra el botón de Nextcloud como principal y esconde
  el número de empleado/contraseña detrás de un link secundario
  ("Iniciar sesión con número de empleado") que lo revela con un clic.
  Verificado visualmente en vivo, ambos modos.
- **Nueva causa de demora "Calidad".** A petición explícita del usuario,
  se agrega al catálogo de `src/data/demoras/catalog.js`
  (`DOWNTIME_REASONS`) entre "Defectos" y "Calificaciones distintas" --
  el catálogo pasa de 14 a 15 opciones. `reasonKey` en `DowntimeRecord`
  es texto libre (sin enum en la base de datos), así que no requiere
  migración.

### Fixed
- **Modo oscuro.** `body` nunca definía un `color` base (solo
  `font-family`), así que cualquier texto sin clase de color explícita
  (`text-2xl font-extrabold` sin `text-foreground`, ~40 casos reales
  encontrados en donas del Dashboard, KPI's de Centro de Trabajo,
  resultados de Auditoría, etc.) heredaba el negro por defecto del
  navegador — invisible sobre fondo oscuro, aunque se veía bien por
  accidente en modo claro. Se agrega `color: hsl(var(--foreground))` a
  `body` (`src/index.css`) para que todo texto sin color propio herede el
  token correcto de cada tema automáticamente. Además, 3 tooltips de
  gráficas (Recharts) sin estilo propio mostraban su fondo blanco fijo por
  defecto en modo oscuro — se les agregó `contentStyle` con los mismos
  tokens de popover que ya usa el resto de la app. Modo claro sin cambios.
- **Inconsistencia del total general de personal.** Dashboard y el tablero
  "Área operando" no excluían ninguna área de apoyo, mientras que "Resumen
  por área" (Centro de Trabajo) excluía Calidad/Entrenador y Asistencia
  excluía Calidad/Gerente FFT/Supervisor — el mismo personal real producía
  un total distinto según la pantalla. Se unifica en
  `EXCLUDED_FROM_PLANT_TOTAL_AREA_IDS` (`src/data/production/catalog.js`,
  única fuente de verdad): Calidad/Gerente FFT/Supervisor/Entrenador nunca
  cuentan en el total general de personal, en ninguna vista.
- **Menú "•••" de Hora por Hora no abría (renderizaba fuera de pantalla).**
  El disparador usaba el componente compartido `Button` dentro de
  `DropdownMenuTrigger asChild` — pero `Button` (`src/components/ui/
  button.jsx`) no está envuelto en `React.forwardRef`, así que Radix nunca
  recibía una referencia real al elemento y su cálculo de posición (Popper)
  se quedaba en el valor placeholder de "sin medir" (el menú se abría, pero
  204px arriba del viewport). Los otros 5 usos de `DropdownMenuTrigger
  asChild` en el repo ya envuelven un `<button>` nativo en vez de `Button`
  — se alinea Hora por Hora al mismo patrón en vez de tocar `Button`
  globalmente (cambio no relacionado y de mayor alcance).
- **Hora activa nunca se detectaba y KPIs mostraban el turno completo desde
  la primera hora.** `buildShiftBlocks()` (`src/data/horaPorHora/
  shiftBlocks.js`) recibía `session.date` tal como lo manda el API — un ISO
  string ("2026-09-04T00:00:00.000Z") — y lo reconstruía con `new
  Date(`${dateLike}T00:00:00`)`, produciendo una fecha inválida; el
  histórico (`HourlyHistoryView.jsx`) y el Excel tenían el mismo problema
  vía `dayjs(session.date)`, mostrando el día anterior en zonas horarias
  detrás de UTC. Se corrige leyendo la fecha de calendario directo del
  string (nunca reinterpretándola con `new Date()`/`dayjs()` sin recortar).
  Adicionalmente, los 4 KPIs principales usaban `computeShiftSummary()`
  (turno completo) en vez de la función ya existente
  `computeCumulativeTotals()` (hasta la hora en curso) — quedó sin conectar
  en la primera versión; ahora los KPIs sí cortan en la hora activa y
  "Resumen del turno"/Excel siguen mostrando el turno completo, como se
  pidió.
- **Errores de Postgres nunca hacían match (500 genérico en vez del
  mensaje claro).** Encontrado en vivo probando "Eliminar usuario": un
  intento de borrar un usuario con registros históricos (auditorías,
  demoras, equipo, etc.) daba un 500 genérico en vez del 409 con mensaje
  claro que el propio código ya devolvía. Causa raíz: drizzle-orm 0.45
  envuelve TODO error de query en su propia clase `DrizzleQueryError`
  (`node_modules/drizzle-orm/pg-core/session.js`, `queryWithCache`) — el
  error real de Postgres (con `.code`/`.constraint`, ej. `23503`
  foreign_key_violation o `23505` unique_violation) queda en `.cause`,
  nunca en el objeto atrapado directamente. Los `catch (e) { if (e.code
  === '23505') ... }` que ya existían en varios endpoints nunca hacían
  match por lo mismo — bug preexistente a esta sesión, recién
  descubierto. Nuevo helper `pgError(e)` (`server-lib/db/pgError.js`,
  devuelve `e.cause` si trae `.code`, si no el propio `e`) aplicado en
  los 5 endpoints afectados: `api/users/index.js`, `api/users/[id].js`
  (los dos casos, PATCH y el nuevo DELETE), `api/access-requests/[id]/
  decide.js`, `api/personnel/checkin.js`,
  `api/personnel/set-unassigned-reason.js`. Verificado en vivo de punta
  a punta: usuario y demora de prueba creados, confirmado el 409 con
  mensaje claro, ambos registros de prueba limpiados por completo al
  terminar.
- **SSO de Nextcloud — el callback real no coincidía con la ruta
  registrada.** Amir (TI/Coolify ops) confirmó las 4 credenciales OIDC ya
  inyectadas en Coolify, con `OIDC_REDIRECT_URI` =
  `https://centro-de-trabajo.mi2.com.mx/auth/callback` (SIN el prefijo
  `/api/auth/oidc` que usa el resto de este módulo desde que se
  implementó, ver `server-lib/oidc.js`). `openid-client` deriva el
  `redirect_uri` real que manda en el intercambio de token de la URL
  exacta de la request (`authorizationCodeGrant` -> `stripParams(
  currentUrl)`, no del valor de la variable de entorno) -- si Nextcloud
  redirige el navegador a `/auth/callback` y el servidor solo escucha en
  `/api/auth/oidc/callback`, el login nunca se completa. Se agregan 2
  alias de ruta reales al mismo handler existente (nunca una copia de la
  lógica) en `server-lib/api-routes.js` (Coolify/dev) y `vercel.json`
  (Vercel): `GET /auth/callback` -> mismo `oidcCallbackHandler`, `GET
  /auth/login` -> mismo `oidcStartHandler` (este último no lo llama
  Nextcloud, solo por la misma convención que describió Amir).
  Verificado localmente que ambas rutas nuevas llegan al handler real
  (responden su propio JSON `{"error":"SSO no configurado"}` en vez del
  404 de Express o el HTML de la SPA). Confirmado en vivo (ver entradas
  siguientes): esta parte funcionó, pero destapó 2 bugs mas en el mismo
  flujo real.
- **SSO de Nextcloud — segundo bug real, encontrado al probar el login
  en vivo tras el fix anterior ("oidcErrorGeneric").** Las cookies de
  tránsito PKCE (`oidc_txn`) y de identidad pendiente (`oidc_pending`,
  `server-lib/oidc.js`) siempre tuvieron `Path=/api/auth/oidc` -- un
  cookie con ese `Path` NUNCA viaja en una request a `/auth/callback`
  (no es un subpath del cookie), así que `readTxnCookie(req)` devolvía
  `null` justo después de agregar el alias externo real de la entrada
  anterior, y el callback redirigía a `txn_expired` (mismo mensaje
  genérico en pantalla que `exchange_failed`, `login.jsx` no distingue
  entre las dos). Se corrige a `Path=/` en los 4 builders de cookie
  (`buildTxnCookie`/`buildClearTxnCookie`/`buildPendingCookie`/
  `buildClearPendingCookie`) -- cubre cualquier ruta del mismo origen,
  `/api/auth/oidc/*` y `/auth/*` por igual, en vez de acotar a un solo
  alias y dejar el otro roto. **Confirmado en vivo: el login real con
  Nextcloud ya funciona** -- Roman lo probó y llegó correctamente hasta
  la identidad real (nombre/email), aunque cayó en "Solicitar acceso"
  porque su cuenta local de siempre nunca tuvo `oidcSub` (ver las 2
  entradas siguientes, encontradas resolviendo justo ese caso).
- **SSO de Nextcloud — tercer bug real, encontrado al intentar vincular
  la cuenta local de siempre de Roman a su identidad de Nextcloud.**
  `api/access-requests/[id]/decide.js` era el ÚNICO endpoint dinámico de
  toda la API que leía `const { id } = req.query` sin el fallback
  `?? req.params?.id` que usa cualquier otro `api/**/[id].js` (ver el
  comentario real en `server-lib/api-routes.js`) -- funcionaba en Vercel
  (que inyecta el segmento dinámico en `req.query`) pero NUNCA en
  Coolify/dev (Express real, sin ese comportamiento): Aprobar/Rechazar
  solicitudes de acceso nunca había funcionado ahí, solo en Vercel.
  Corregido a la misma convención del resto de la API. Encontrado y
  verificado en vivo probando el nuevo `action='link'` (ver "Added"
  arriba) con datos de prueba desechables (creados y limpiados por
  completo al terminar).
- **Botón "Iniciar sesión con Nextcloud" descentrado.** `LoginPage.jsx`:
  el `<Button asChild>` era hijo directo de un Fragment (`<>...</>`),
  sin ningún contenedor que lo centrara -- quedaba pegado a la izquierda
  de la tarjeta de login en vez de alineado con el resto. Se envuelve en
  un `<div className="flex flex-col items-center gap-4">` con el botón
  (y la alerta de error, si la hay) a `w-full`, mismo ancho que el resto
  de la tarjeta. Verificado visualmente en vivo.
- **Mover personal se revertía solo a los ~15s.** `moveEmployee`
  (`src/data/personnel/repository.js`) escribía el store local de
  inmediato y mandaba `syncMove` al servidor en segundo plano
  (fire-and-forget, solo `console.error` si fallaba); si el POST real
  fallaba u omitía (estación llena de verdad, empleado dado de baja
  mientras tanto, puesto renombrado, o red intermitente en una
  tablet), el siguiente sondeo de `apiSync.js` (cada 2s, tras la
  ventana de gracia de 15s) restauraba la posición real del servidor
  sin ningún error visible -- exactamente el mismo tipo de bug ya
  corregido para el intercambio/swap (2026-09-02). `syncMove` ahora es
  `async` y `moveEmployee` espera la confirmación real del servidor
  ANTES de tocar el store local (mismo patrón que
  `setEmployeeUnassignedReason`): si el servidor rechaza el
  movimiento, el error real se muestra de inmediato en el diálogo, en
  vez de un estado optimista que se revierte solo. El auto-relleno en
  bloque (`reconcileLineAssignments`) sigue siendo fire-and-forget a
  propósito (no es una acción explícita del usuario).

### Pending (bloqueado en credenciales externas — ver checklist entregado al usuario)
- Ninguno -- SSO de Nextcloud confirmado funcionando en vivo (ver Fixed
  arriba: 3 bugs reales encontrados y corregidos en el camino -- ruta de
  callback, Path de cookies, y extracción de id en decide.js).

## [1.0.0]

Estado de producción antes de iniciar la migración de stack. Gestión
completa de personal de piso: asignación diaria por estación, movimientos
con aprobación (LIDER → SUPERVISOR/ADMINISTRADOR), asistencia, catálogo de
personal importado desde Excel (con colas de revisión para conflictos de
baja/duplicados), permisos por rol y por usuario, y un plano operativo 2D
del piso (WC Líneas 0-10, Paletizado, Accesorios, Insumos, Midea/High
Value, Conveyor). Desplegado en Vercel con integración automática de
GitHub (`desarrollo-personal` → Preview, `main` → Producción).
