import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  cellTextClass,
  cellTextSecondaryClass,
  metricChipClass,
  pageClass,
  pageSubtitleClass,
  pageTitleClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { getAssignmentsForDate } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import {
  canonicalOperationalAreaId,
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
      tabla hasta recargar la pagina.
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
   como "Sin dato", tambien neutro. */

const HISTORIC_STATUS = {
  F: { i18nKey: 'statusFalta', tone: 'bad' },
  I: { i18nKey: 'statusIncapacidad', tone: 'warn' },
  V: { i18nKey: 'statusVacaciones', tone: 'info' },
  A: { i18nKey: 'statusAsistioHistorico', tone: 'default' },
}

function AttendanceCells({ person, t }) {
  if (person.todayAssignment) {
    return (
      <>
        <TableCell>
          <span className={metricChipClass('ok')}>{t('statusPresentToday')}</span>
        </TableCell>
        <TableCell className={cellTextSecondaryClass}>
          {person.todayAssignment.checkInAt
            ? t('detailCheckedInAt', { time: person.todayAssignment.checkInAt })
            : '—'}
        </TableCell>
      </>
    )
  }

  const historic = person.asistencia ? HISTORIC_STATUS[person.asistencia] : null
  if (historic) {
    return (
      <>
        <TableCell>
          <span className={metricChipClass(historic.tone)}>
            {t(historic.i18nKey)} ({person.asistencia})
          </span>
        </TableCell>
        <TableCell className={cellTextSecondaryClass}>
          {t('detailHistoricDate', { date: dayjs(BASE_SNAPSHOT_DATE).format('DD/MM/YYYY') })}
        </TableCell>
      </>
    )
  }

  return (
    <>
      <TableCell>
        <span className={metricChipClass('default')}>{t('statusUnknown')}</span>
      </TableCell>
      <TableCell className={cellTextSecondaryClass}>—</TableCell>
    </>
  )
}

function AreaGroupRows({ group, t }) {
  return (
    <>
      <TableRow className="border-b border-border bg-black/[.025] dark:bg-white/[.035]">
        <TableCell colSpan={3} className="py-2 text-[12px] font-extrabold">
          {group.name} ({group.people.length})
        </TableCell>
      </TableRow>
      {group.people.map((person, idx) => (
        <TableRow key={person.id} className={tableRowClass(idx)}>
          <TableCell className={cn(cellTextClass, 'font-bold')}>{person.name}</TableCell>
          <AttendanceCells person={person} t={t} />
        </TableRow>
      ))}
    </>
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
    const areaGroups = canonicalAreas
      .map((w) => ({
        id: w.id,
        name: w.name,
        people: withPresence(getGroupPeople(operationalGroupMembers(w.id))),
      }))
      .filter((g) => g.people.length > 0)

    // "Sin area asignada" (misma fuente que la card ya existente en Centro
    // de Trabajo, getPeopleWithoutArea) al final -- incluye tambien a quien
    // el Excel ubico en una zona archivada SIN fusion (ej. SOPORTE, ver
    // personnelByArea.getPeopleByArea: esas personas nunca quedan
    // "atrapadas" en un area que ya no se muestra en ningun lado).
    const sinArea = withPresence(getPeopleWithoutArea())
    if (sinArea.length > 0) {
      areaGroups.push({ id: 'SIN_AREA', name: t('areaSinAsignar'), people: sinArea })
    }
    return areaGroups
  }, [t, version])

  const totalPeople = groups.reduce((sum, g) => sum + g.people.length, 0)

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
            <p className={cardHeaderTitleClass}>{t('tableTitle')}</p>
            <p className={cardHeaderSubtitleClass}>{t('tableSubtitle')}</p>
          </div>
        </div>

        {totalPeople === 0 ? (
          <EmptyState title={t('emptyStateTitle')} description={t('emptyStateDescription')} />
        ) : (
          <div className="max-h-[75vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className={tableHeaderRowClass}>
                  <TableHead>{t('colEmployee')}</TableHead>
                  <TableHead>{t('colStatus')}</TableHead>
                  <TableHead>{t('colDetail')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <AreaGroupRows key={group.id} group={group} t={t} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
