import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  metricChipClass,
  pageClass,
  pageSubtitleClass,
  pageTitleClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import EmployeeAvatar from '../centro-trabajo/EmployeeAvatar'
import { getAssignmentsForDate } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import {
  canonicalOperationalAreaId,
  LINE_FAMILY_AREA_IDS,
  operationalGroupMembers,
  WORK_CENTERS,
} from '../../data/production/catalog'
import {
  BASE_SNAPSHOT_DATE,
  getGroupPeople,
  getPeopleWithoutArea,
} from '../../data/production/personnelByArea'
import { EmptyState } from '../../ui'

/* Modulo Asistencia (2026-09-01, a peticion explicita del usuario: "en mi
   modulo de asistencia ya lo puedes crear, pon a todos los que tenemos
   ahi... analizalo y ponlos a todos... por areas de trabajo") -- reemplaza
   el placeholder "Proximamente" (ComingSoonPage) que tenia esta ruta.

   Investigacion previa (para no duplicar trabajo ya hecho): el Excel
   "LAYOUT FFT.xlsx" (hoja "BASE ") YA esta importado por completo --
   src/data/production/realPersonnelSnapshot.js (REAL_PERSONNEL_SNAPSHOT,
   116 filas reales capturadas 2026-08-18, BASE_SNAPSHOT_DATE) alimenta ya
   todo Centro de Trabajo, y esas mismas filas ya fueron sembradas en
   Postgres real (scripts/seed-personnel.mjs, columnas rawZona/actividad/
   baseAsistencia en Employee). Esta pagina NO vuelve a importar nada:
   reutiliza esa misma fuente (getGroupPeople/personnelByArea.js) para no
   crear una segunda copia de los mismos datos con otro criterio de
   mapeo ZONA->area.

   Tambien se confirmo que el punto 2 del pedido ("que le tome la
   asistencia en automatico" al registrar a alguien en un puesto) YA
   estaba resuelto antes de este cambio: checkInEmployee (repository.js,
   ~linea 527) ya llama ensureAttendance() en cuanto confirma la
   asignacion, y del lado servidor placeEmployee() (server-lib/
   personnel.js) inserta Attendance real en la MISMA transaccion que la
   asignacion (api/personnel/checkin.js). No se toco ese codigo -- ya
   hace exactamente lo pedido.

   Esta pagina SOLO LEE (mismo patron de solo-lectura que Evaluaciones/
   KPI's) y agrupa por area de trabajo usando los mismos WORK_CENTERS de
   catalog.js que ya usa el resto de Centro de Trabajo (nunca un esquema
   de areas nuevo). Para cada persona, el estado se decide con 2 fuentes
   SIN mezclarlas:

   1) Asignacion REAL de HOY (getAssignmentsForDate, repository.js) --
      unica fuente que se muestra como "Presente hoy" (verde). Se usa esta
      tabla (DailyAssignment/`assignments`) y NO la tabla `Attendance`
      local (isPresentToday/getAttendanceForDate) porque solo `assignments`
      se fusiona cross-device en cada poll de 2s (ver pollOnce en
      apiSync.js, que jala /api/personnel/roster y escribe con
      writeAssignments) -- Attendance es un store puramente local que solo
      se llena en el MISMO navegador que hizo el check-in, asi que un
      supervisor viendo esta pagina en otro dispositivo nunca la veria
      actualizarse. `usePersonnelVersion()` se agrega como dependencia del
      useMemo de abajo por la misma razon: sin eso, un check-in real
      (propio o sincronizado desde otro dispositivo) nunca refresca esta
      pagina hasta recargar.
   2) Codigo HISTORICO de la columna ASISTENCIA de BASE (capturado
      2026-08-18) -- SOLO para quien todavia no tiene una asignacion real
      hoy. Se muestra siempre junto con su fecha de origen, nunca como si
      fuera el estado de HOY (ya paso mas de una semana desde esa
      captura).

   Significado de los codigos de ASISTENCIA -- confirmado cruzando la
   hoja "LAYOUT" del Excel (seccion visual FALTAS/SUSPENSION/VACACIONES/
   INCAPACIDAD con nombres de personas) contra la columna ASISTENCIA de
   "BASE " para esas mismas personas: coincide exacto en los 3 casos ->
   F=Falta, I=Incapacidad, V=Vacaciones. "A" NO tiene una celda de
   leyenda explicita en el archivo (es el unico codigo restante, el
   mayoritario: 90 de 116) -- se muestra como "Asistio" pero en tono
   NEUTRO/gris (nunca verde), porque esa lectura es una inferencia
   razonable, no una leyenda confirmada como las otras 3 -- para no
   inventar una certeza que el archivo no da. Quien no trae codigo
   historico (personal agregado despues, ej. ids "sem34-N") se muestra
   como "Sin dato", tambien neutro.

   Rediseño tarjetas + drill-down (2026-09-02, a peticion explicita del
   usuario -- "esperaba cards por area, y dentro de las cards de area
   estuvieran los trabajadores... la card de lineas FFT, le doy click y
   salen las 11 lineas, le doy click a una y ya veo quien esta ahi"):
   reemplaza la tabla plana por 3 niveles de navegacion local (groups ->
   lines -> people, useState simple, sin ruta nueva). CERO cambios a la
   forma en que se obtienen/calculan las personas o su estado de
   asistencia (mismas 2 fuentes de arriba, mismo HISTORIC_STATUS) -- la
   UNICA diferencia real de datos es que las 11 CT LINEA reales
   (LINE_FAMILY_AREA_IDS, el mismo set que ya usa AuditoriaPage.jsx para
   el mismo proposito) se agrupan en una sola card de nivel 1
   ("Lineas de produccion") en vez de aparecer sueltas: cada linea
   individual sigue usando exactamente
   getGroupPeople(operationalGroupMembers(w.id)) + withPresence, igual
   que cualquier otra area. Las demas areas (Insumos, Accesorios,
   Midea/High Value, Paletizado, Calidad, Conveyor General, Capacitacion,
   Team Leader, Entrenador, Limpieza, Gerente, Supervisor) y "Sin area
   asignada" van directo de su card de nivel 1 al listado de personas,
   sin nivel intermedio -- el mismo comportamiento de siempre, solo que
   como cards en vez de filas de tabla. */

const HISTORIC_STATUS = {
  F: { i18nKey: 'statusFalta', tone: 'bad' },
  I: { i18nKey: 'statusIncapacidad', tone: 'warn' },
  V: { i18nKey: 'statusVacaciones', tone: 'info' },
  A: { i18nKey: 'statusAsistioHistorico', tone: 'default' },
}

function attendanceStatusFor(person, t) {
  if (person.todayAssignment) {
    return {
      chip: t('statusPresentToday'),
      tone: 'ok',
      detail: person.todayAssignment.checkInAt
        ? t('detailCheckedInAt', { time: person.todayAssignment.checkInAt })
        : '—',
    }
  }

  const historic = person.asistencia ? HISTORIC_STATUS[person.asistencia] : null
  if (historic) {
    return {
      chip: `${t(historic.i18nKey)} (${person.asistencia})`,
      tone: historic.tone,
      detail: t('detailHistoricDate', { date: dayjs(BASE_SNAPSHOT_DATE).format('DD/MM/YYYY') }),
    }
  }

  return { chip: t('statusUnknown'), tone: 'default', detail: '—' }
}

/* Foto de empleado: reusa el EmployeeAvatar COMPARTIDO de Centro de
   Trabajo (23 consumidores en la app) en vez de una copia local -- ahora
   si tiene con que pintar una foto real, porque `person.photoUrl` ya
   viene resuelto desde REAL_PERSONNEL_SNAPSHOT/personnelByArea.js (ver
   comentario de `photoUrl` en realPersonnelSnapshot.js: extraida del
   Excel 2026-09-02). EmployeeAvatar ya cae solo a iniciales cuando
   `photoUrl` es null/undefined (personal "sem34-N", filas de BASE sin
   foto, o cualquier empleado creado despues) -- no hace falta repetir
   esa logica aqui. */
function EmployeeCard({ person, t }) {
  const status = attendanceStatusFor(person, t)
  return (
    <div className={cn(cardClass, 'p-3')}>
      <div className="flex items-start gap-2.5">
        <EmployeeAvatar employee={person} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-extrabold">{person.name}</p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{status.detail}</p>
          <div className="mt-1.5">
            <span className={metricChipClass(status.tone)}>{status.chip}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* Cards de nivel 1 (grupos de area) y nivel 2 (lineas dentro de "Lineas de
   produccion") comparten el mismo diseño de tarjeta clicable -- mismo
   lenguaje visual que AuditModuleCard (AuditoriaPage.jsx) y las cards de
   "Areas de trabajo" del resto de Centro de Trabajo (cardClass, hover
   sutil, chip de conteo). */
function GroupCard({ name, count, onClick, hasDrillDown }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        cardClass,
        'flex cursor-pointer select-none flex-col gap-3 p-5 text-left transition-transform duration-150 hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/[0.12]">
          <Users className="h-5 w-5 text-blue-500" />
        </div>
        {hasDrillDown && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
      <div>
        <p className="text-[15px] font-extrabold">{name}</p>
        <p className="mt-0.5 text-[12px] font-semibold text-muted-foreground">{count}</p>
      </div>
    </button>
  )
}

function BackButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12.5px] font-bold text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  )
}

export default function AsistenciaPage() {
  const { t } = useTranslation('asistencia')
  // Re-renderiza en cuanto un check-in/movimiento real cambia el store local
  // (mismo hook que usa el resto de Centro de Trabajo) -- version se pasa
  // como dependencia del useMemo de abajo; sin eso, marcar presente a
  // alguien desde Registro de personal (en este dispositivo o sincronizado
  // desde otro) no se reflejaria aqui hasta recargar la pagina.
  const version = usePersonnelVersion()

  const groups = useMemo(() => {
    // getAssignmentsForDate (repository.js), NO Attendance local -- es la
    // unica de las dos que apiSync.js fusiona cross-device en cada poll de
    // 2s (ver pollOnce/writeAssignments), asi que es la fuente correcta
    // para "Presente hoy" sin importar en que dispositivo se hizo el
    // check-in.
    const assignmentsByEmployee = new Map(
      getAssignmentsForDate().map((a) => [a.employeeId, a]),
    )
    const withPresence = (people) =>
      people.map((p) => ({ ...p, todayAssignment: assignmentsByEmployee.get(p.id) || null }))

    // Mismo patron exacto que getAllAreaSummaries() (personnelByArea.js):
    // solo una fila por area CANONICA activa, sumando via
    // operationalGroupMembers el personal de areas fusionadas/archivadas
    // (BOX_PREP/SUMINISTRO_MATERIAL -> INSUMOS, CONVEYOR_SECUNDARIO/SELLADO
    // -> CONVEYOR_PRINCIPAL) -- necesario para no "perder" a nadie que el
    // Excel ubico en una de esas zonas fusionadas.
    const canonicalAreas = WORK_CENTERS.filter(
      (w) => w.active !== false && canonicalOperationalAreaId(w.id) === w.id,
    )

    // Las 11 CT LINEA reales (LINEA1..10 + PROYECTO/CT LINEA 0) se agrupan
    // en una sola card de nivel 1 ("Lineas de produccion") -- mismo
    // LINE_FAMILY_AREA_IDS que ya usa AuditoriaPage.jsx para el mismo fin.
    // Cada linea individual sigue calculandose exactamente igual que
    // cualquier otra area (getGroupPeople + operationalGroupMembers +
    // withPresence), nunca una segunda fuente.
    const lineWorkCenters = canonicalAreas.filter((w) => LINE_FAMILY_AREA_IDS.has(w.id))
    const lines = lineWorkCenters.map((w) => ({
      id: w.id,
      name: w.name,
      people: withPresence(getGroupPeople(operationalGroupMembers(w.id))),
    }))
    const linesTotalPeople = lines.reduce((sum, l) => sum + l.people.length, 0)

    const otherAreaGroups = canonicalAreas
      .filter((w) => !LINE_FAMILY_AREA_IDS.has(w.id))
      .map((w) => ({
        id: w.id,
        kind: 'people',
        name: w.name,
        people: withPresence(getGroupPeople(operationalGroupMembers(w.id))),
      }))
      .filter((g) => g.people.length > 0)

    const areaGroups = []
    if (linesTotalPeople > 0) {
      areaGroups.push({
        id: 'LINEAS',
        kind: 'lines',
        name: t('groupLines'),
        lines,
        people: lines.flatMap((l) => l.people),
      })
    }
    areaGroups.push(...otherAreaGroups)

    // "Sin area asignada" (misma fuente que la card ya existente en Centro
    // de Trabajo, getPeopleWithoutArea) al final -- incluye tambien a quien
    // el Excel ubico en una zona archivada SIN fusion (ej. SOPORTE, ver
    // personnelByArea.getPeopleByArea: esas personas nunca quedan
    // "atrapadas" en un area que ya no se muestra en ningun lado).
    const sinArea = withPresence(getPeopleWithoutArea())
    if (sinArea.length > 0) {
      areaGroups.push({ id: 'SIN_AREA', kind: 'people', name: t('areaSinAsignar'), people: sinArea })
    }
    return areaGroups
  }, [t, version])

  const totalPeople = groups.reduce(
    (sum, g) => sum + (g.kind === 'lines' ? g.people.length : g.people.length),
    0,
  )

  // Navegacion local (2026-09-02, sin router nuevo): groups -> lines (solo
  // para "Lineas de produccion") -> people. `groupId`/`lineId` se
  // resuelven contra `groups` en cada render, nunca se guarda una copia
  // del objeto (asi siempre reflejan el useMemo mas reciente, ej. si un
  // check-in cambia el conteo mientras el usuario esta adentro).
  const [nav, setNav] = useState({ level: 'groups', groupId: null, lineId: null })

  const selectedGroup = groups.find((g) => g.id === nav.groupId) || null
  const selectedLine =
    selectedGroup?.kind === 'lines'
      ? selectedGroup.lines.find((l) => l.id === nav.lineId) || null
      : null

  function openGroup(group) {
    if (group.kind === 'lines') {
      setNav({ level: 'lines', groupId: group.id, lineId: null })
    } else {
      setNav({ level: 'people', groupId: group.id, lineId: null })
    }
  }

  function openLine(line) {
    setNav((prev) => ({ ...prev, level: 'people', lineId: line.id }))
  }

  function goToGroups() {
    setNav({ level: 'groups', groupId: null, lineId: null })
  }

  function goToLines() {
    setNav((prev) => ({ level: 'lines', groupId: prev.groupId, lineId: null }))
  }

  const peopleToShow = selectedLine ? selectedLine.people : selectedGroup?.people || []

  return (
    <div className={pageClass}>
      <div className={cn(cardClass, 'mb-4')}>
        <div className="border-b border-border bg-black/[.015] px-5 py-3.5 dark:bg-white/[.02]">
          <p className={pageTitleClass}>{t('pageTitle')}</p>
          <p className={pageSubtitleClass}>{t('pageSubtitle')}</p>
        </div>
      </div>

      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <div className="min-w-0 flex-1">
            {nav.level === 'groups' && (
              <>
                <p className={cardHeaderTitleClass}>{t('tableTitle')}</p>
                <p className={cardHeaderSubtitleClass}>{t('tableSubtitle')}</p>
              </>
            )}
            {nav.level === 'lines' && selectedGroup && (
              <>
                <BackButton label={t('backToGroups')} onClick={goToGroups} />
                <p className={cn(cardHeaderTitleClass, 'mt-1')}>{selectedGroup.name}</p>
                <p className={cardHeaderSubtitleClass}>{t('linesSubtitle')}</p>
              </>
            )}
            {nav.level === 'people' && selectedGroup && (
              <>
                <BackButton
                  label={selectedLine ? t('backToLines') : t('backToGroups')}
                  onClick={selectedLine ? goToLines : goToGroups}
                />
                <p className={cn(cardHeaderTitleClass, 'mt-1')}>
                  {selectedLine ? selectedLine.name : selectedGroup.name}
                </p>
                <p className={cardHeaderSubtitleClass}>
                  {t('peopleSubtitle', { count: peopleToShow.length })}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="p-4">
          {nav.level === 'groups' &&
            (totalPeople === 0 ? (
              <EmptyState title={t('emptyStateTitle')} description={t('emptyStateDescription')} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    name={group.name}
                    count={t('peopleCount', { count: group.people.length })}
                    hasDrillDown={group.kind === 'lines'}
                    onClick={() => openGroup(group)}
                  />
                ))}
              </div>
            ))}

          {nav.level === 'lines' && selectedGroup && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedGroup.lines.map((line) => (
                <GroupCard
                  key={line.id}
                  name={line.name}
                  count={t('peopleCount', { count: line.people.length })}
                  hasDrillDown={false}
                  onClick={() => openLine(line)}
                />
              ))}
            </div>
          )}

          {nav.level === 'people' &&
            (peopleToShow.length === 0 ? (
              <EmptyState title={t('emptyStateTitle')} description={t('emptyStateDescription')} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {peopleToShow.map((person) => (
                  <EmployeeCard key={person.id} person={person} t={t} />
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
