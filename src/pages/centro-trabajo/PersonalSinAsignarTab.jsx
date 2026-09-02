import dayjs from 'dayjs'
import { Undo2, UserCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  metricChipClass,
  statusChipClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { setEmployeeUnassignedReason } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getPeopleWithoutArea } from '../../data/production/personnelByArea'
import { EmptyState } from '../../ui'
import { showToast } from '../../ui/toast'
import EmployeeAvatar from './EmployeeAvatar'

/* Pestaña propia "Personal sin asignar" (2026-09-02, a peticion explicita del usuario):
   primer intento la metia como una card mas dentro de Personal (entre Registro de hoy y
   Directorio) -- el usuario pidio que fuera una pestaña separada, al mismo nivel que
   Personal/Bajas en la barra de arriba (ver CentroTrabajoPage.jsx), para que no compita
   por espacio con el resto de esa pantalla. Misma logica/contrato de datos de siempre,
   solo cambio donde vive: quien HOY no tiene ubicacion real en ninguna area
   (getPeopleWithoutArea, ya excluye BAJA automaticamente) puede marcarse con un motivo
   real y persistente (BAJA/TURNO/FALTA) via setEmployeeUnassignedReason -- DELIBERADAMENTE
   async/esperado (repository.js), nunca fire-and-forget: si falla, no se toca el store
   local y se muestra el error real; si tiene exito, ya llamo notify() internamente
   (usePersonnelVersion re-renderiza solo, sin estado optimista propio). */
export default function PersonalSinAsignarTab() {
  const { t } = useTranslation('centroTrabajo')
  const version = usePersonnelVersion()
  const [savingReasonId, setSavingReasonId] = useState(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const people = useMemo(() => getPeopleWithoutArea(), [version])

  async function handleSetReason(person, reason) {
    setSavingReasonId(person.id)
    try {
      await setEmployeeUnassignedReason(person.id, reason)
      showToast(
        reason
          ? t('personalDeHoyTab.reasonSetSuccessToast')
          : t('personalDeHoyTab.reasonClearedSuccessToast'),
        'success',
      )
    } catch (err) {
      showToast(err.message || t('personalDeHoyTab.reasonSetErrorFallback'), 'error')
    } finally {
      setSavingReasonId(null)
    }
  }

  return (
    <div className={cn(cardClass, 'mt-4')}>
      <div className={cn(cardHeaderClass, 'justify-between')}>
        <div className="flex items-center gap-2">
          <UserCog className="h-[18px] w-[18px] text-muted-foreground" />
          <div>
            <p className={cardHeaderTitleClass}>{t('personalDeHoyTab.sinAsignarTitle')}</p>
            <p className={cardHeaderSubtitleClass}>{t('personalDeHoyTab.sinAsignarSubtitle')}</p>
          </div>
        </div>
        <span className={cn(metricChipClass(people.length > 0 ? 'warn' : 'default'), 'shrink-0')}>
          {t('personalDeHoyTab.sinAsignarCountChip', { count: people.length })}
        </span>
      </div>
      <div className="p-4">
        {people.length === 0 ? (
          <EmptyState
            compact
            title={t('personalDeHoyTab.sinAsignarEmptyTitle')}
            description={t('personalDeHoyTab.sinAsignarEmptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((p) => (
              <PersonaSinAsignarItem
                key={p.id}
                person={p}
                saving={savingReasonId === p.id}
                onSetReason={handleSetReason}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const REASON_LABEL_KEY = {
  BAJA: 'personalDeHoyTab.reasonBajaLabel',
  TURNO: 'personalDeHoyTab.reasonTurnoLabel',
  FALTA: 'personalDeHoyTab.reasonFaltaLabel',
}

function PersonaSinAsignarItem({ person, saving, onSetReason }) {
  const { t } = useTranslation('centroTrabajo')
  const reason = person.unassignedReason || null
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] border border-border p-3">
      <div className="flex items-center gap-2.5">
        <EmployeeAvatar employee={person} size={38} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold">{person.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatEmployeeNumber(person.employeeNumber)}
          </p>
        </div>
      </div>
      {reason && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={statusChipClass(reason === 'BAJA' ? 'CANCELADA' : 'PENDIENTE')}>
            {t(REASON_LABEL_KEY[reason])}
          </span>
          {person.unassignedReasonSetAt && (
            <span className="text-[10.5px] font-medium text-muted-foreground">
              {dayjs(person.unassignedReasonSetAt).format('DD/MM/YYYY HH:mm')}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onSetReason(person, 'BAJA')}
          className="h-7 flex-1 min-w-[68px] text-[11px] font-bold text-destructive hover:text-destructive"
        >
          {t('personalDeHoyTab.markBajaButton')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onSetReason(person, 'TURNO')}
          className="h-7 flex-1 min-w-[68px] text-[11px] font-bold"
        >
          {t('personalDeHoyTab.markTurnoButton')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => onSetReason(person, 'FALTA')}
          className="h-7 flex-1 min-w-[68px] text-[11px] font-bold"
        >
          {t('personalDeHoyTab.markFaltaButton')}
        </Button>
      </div>
      {reason && (
        <Button
          size="sm"
          variant="ghost"
          disabled={saving}
          onClick={() => onSetReason(person, null)}
          className="h-6 w-fit self-start px-1.5 text-[10.5px] font-bold text-muted-foreground"
        >
          <Undo2 className="h-3 w-3" />
          {t('personalDeHoyTab.clearReasonButton')}
        </Button>
      )}
    </div>
  )
}
