import { ChevronRight, Users2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { sectionTitleClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { hasLineStations, workCenterById } from '../../data/production/catalog'
import {
  getAreaStaffing,
  getFftPeopleWithLine,
  getPeopleByArea,
} from '../../data/production/personnelByArea'
import { EmptyState } from '../../ui'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'

function StaffingLine({ staffing }) {
  const { t } = useTranslation('centroTrabajo')
  if (staffing.ideal == null) {
    return (
      <p className="mb-4 text-[11.5px] text-muted-foreground">
        {t('areaDetailPanel.noStaffingDefined')}
      </p>
    )
  }
  const complete = staffing.status === 'COMPLETA'
  const missing = staffing.ideal - staffing.real
  return (
    <div className="mb-4 flex items-center gap-2">
      <span
        className={cn(
          'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-extrabold',
          complete ? 'bg-emerald-500/[0.13] text-emerald-700' : 'bg-red-500/[0.13] text-red-700',
        )}
      >
        {staffing.real} / {staffing.ideal}
      </span>
      <p className={cn('text-[11.5px] font-bold', complete ? 'text-emerald-500' : 'text-red-500')}>
        {complete
          ? t('areaDetailPanel.complete')
          : t('areaDetailPanel.missingCount', { count: missing })}
      </p>
    </div>
  )
}

const SAMPLE_LIMIT = 8

function StatusChip({ hasPeople }) {
  const { t } = useTranslation('centroTrabajo')
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2 text-xs font-bold',
        hasPeople
          ? 'border-emerald-500/[0.33] bg-emerald-500/[0.13] text-emerald-500'
          : 'border-slate-400/[0.33] bg-slate-400/[0.13] text-slate-500',
      )}
    >
      {hasPeople ? t('areaDetailPanel.hasStaff') : t('areaDetailPanel.noStaffToday')}
    </span>
  )
}

function PendingEmployeeNumberNote() {
  const { t } = useTranslation('centroTrabajo')
  return (
    <p className="mt-4 text-[10.5px] leading-[1.5] text-muted-foreground">
      {t('areaDetailPanel.pendingEmployeeNumberNote')}
    </p>
  )
}

function PersonRow({ person, secondary, onClickSecondary }) {
  return (
    <DraggablePersonChip employeeId={person.id}>
      <div className="flex items-center gap-2.5">
        <EmployeeAvatar employee={{ name: person.name }} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{person.name}</p>
        </div>
        {secondary && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClickSecondary?.()
            }}
            className={cn(
              'inline-flex h-5 items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 text-[10px] font-semibold text-[#334155] dark:border-white/[.08] dark:bg-white/[.05] dark:text-[#E2E8F0]',
              onClickSecondary ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            {secondary}
          </button>
        )}
      </div>
    </DraggablePersonChip>
  )
}

/* ─────────────────────────────────────────────
   Panel de detalle de la pestaña "Areas de trabajo" — se muestra
   inline en desktop/tablet (columna derecha) y dentro de un Drawer
   inferior en movil. NO duplica al LineDetailDrawer operativo (con
   estaciones, registrar personal, mover personal, etc): ese sigue
   siendo la vista de gestion completa, a la que este panel enlaza
   via "Ver gestion completa".

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind. Este
   componente ya no gestiona su propio Drawer/Dialog -- eso lo hace
   ahora AreasLayoutView.jsx (Dialog con clases `md:` para el sheet
   lateral/inferior) -- aqui solo se renderiza el contenido, igual
   que antes. */
export default function AreaDetailPanel({ selection, onSelectArea, onOpenFullDrawer }) {
  const { t } = useTranslation('centroTrabajo')
  usePersonnelVersion()
  const [showAllFft, setShowAllFft] = useState(false)
  const [showAllPeople, setShowAllPeople] = useState(false)

  if (!selection) {
    return (
      <div className="p-5">
        <EmptyState
          compact
          title={t('areaDetailPanel.selectAreaTitle')}
          description={t('areaDetailPanel.selectAreaDescription')}
        />
      </div>
    )
  }

  if (selection.type === 'empty') {
    return (
      <div className="p-5">
        <p className="mb-3 text-[17px] font-extrabold">{selection.label}</p>
        <EmptyState
          compact
          title={t('areaDetailPanel.noDataTitle')}
          description={t('areaDetailPanel.noDataDescription')}
        />
      </div>
    )
  }

  if (selection.type === 'zoneGroup') {
    const people = getFftPeopleWithLine()
    const visible = showAllFft ? people : people.slice(0, SAMPLE_LIMIT)
    const idealSum = selection.areaIds.reduce(
      (s, id) => s + (workCenterById(id)?.idealHeadcount ?? 0),
      0,
    )
    const fftComplete = people.length >= idealSum
    const fftMissing = idealSum - people.length
    return (
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[18px] font-extrabold">{selection.label}</p>
          <StatusChip hasPeople={people.length > 0} />
        </div>

        <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          {t('areaDetailPanel.totalPeople')}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <Users2 className="h-6 w-6 text-blue-500" />
          <p className="text-[22px] font-extrabold">
            {t('areaDetailPanel.peopleCount', { count: people.length })}
          </p>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-extrabold',
              fftComplete
                ? 'bg-emerald-500/[0.13] text-emerald-700'
                : 'bg-red-500/[0.13] text-red-700',
            )}
          >
            {people.length} / {idealSum}
          </span>
          <p
            className={cn(
              'text-[11.5px] font-bold',
              fftComplete ? 'text-emerald-500' : 'text-red-500',
            )}
          >
            {fftComplete
              ? t('areaDetailPanel.complete')
              : t('areaDetailPanel.missingCount', { count: fftMissing })}
          </p>
        </div>

        <p className={cn(sectionTitleClass, 'mb-2 text-[13px]')}>
          {t('areaDetailPanel.linesCount', { count: selection.areaIds.length })}
        </p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {selection.areaIds.map((id) => {
            const staffing = getAreaStaffing(id)
            const line = workCenterById(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectArea(id)}
                className="rounded-[15px] border border-border p-2 text-left transition-colors hover:border-blue-500"
              >
                <p className="text-[12.5px] font-bold">{line?.name}</p>
                <p
                  className={cn(
                    'text-[11px] font-bold',
                    staffing.status === 'COMPLETA' ? 'text-emerald-500' : 'text-red-500',
                  )}
                >
                  {staffing.real} / {staffing.ideal}
                </p>
              </button>
            )
          })}
        </div>

        <p className={cn(sectionTitleClass, 'mb-2 text-[13px]')}>
          {t('areaDetailPanel.assignedPersonnel')}{' '}
          {showAllFft ? '' : t('areaDetailPanel.sampleSuffix')}
        </p>
        {people.length === 0 ? (
          <EmptyState compact title={t('areaDetailPanel.emptyFftTitle')} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                secondary={p.lineName}
                onClickSecondary={() => onSelectArea(p.lineId)}
              />
            ))}
          </div>
        )}
        {people.length > SAMPLE_LIMIT && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAllFft((v) => !v)}
            className="mt-2 font-bold"
          >
            {showAllFft
              ? t('areaDetailPanel.showLess')
              : t('areaDetailPanel.showAllPeopleButton', { count: people.length })}
          </Button>
        )}

        <div className="my-4 border-t border-border" />
        <PendingEmployeeNumberNote />
      </div>
    )
  }

  const area = workCenterById(selection.id)
  if (!area) return null
  const isLine = hasLineStations(area.id)
  const people = getPeopleByArea()[selection.id] || []
  const visible = showAllPeople ? people : people.slice(0, SAMPLE_LIMIT)
  const staffing = getAreaStaffing(area.id)

  return (
    <div className="p-5">
      {isLine && (
        <div className="mb-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onSelectArea('__FFT__')}
            className="text-[11.5px] font-bold text-muted-foreground hover:text-blue-500"
          >
            {t('areaDetailPanel.fftBreadcrumb')}
          </button>
          <ChevronRight className="h-[14px] w-[14px] text-muted-foreground" />
        </div>
      )}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[18px] font-extrabold">{area.name}</p>
        <StatusChip hasPeople={people.length > 0} />
      </div>

      <p className="text-[10.5px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
        {t('areaDetailPanel.totalPeople')}
      </p>
      <div className="mb-2 mt-0.5 flex items-center gap-2">
        <Users2 className="h-6 w-6 text-blue-500" />
        <p className="text-[22px] font-extrabold">
          {t('areaDetailPanel.peopleCount', { count: people.length })}
        </p>
      </div>
      <StaffingLine staffing={staffing} />

      <p className={cn(sectionTitleClass, 'mb-2 text-[13px]')}>
        {t('areaDetailPanel.assignedPersonnel')}
      </p>
      {people.length === 0 ? (
        <EmptyState compact title={t('areaDetailPanel.emptyAreaTitle')} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </div>
      )}
      {people.length > SAMPLE_LIMIT && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowAllPeople((v) => !v)}
          className="mt-2 font-bold"
        >
          {showAllPeople
            ? t('areaDetailPanel.showLess')
            : t('areaDetailPanel.showAllPeopleButton', { count: people.length })}
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => onOpenFullDrawer(area.id)}
        className="mt-4 w-full rounded-[20px] font-bold"
      >
        {t('areaDetailPanel.assignEmployeeButton')}
      </Button>

      <div className="my-4 border-t border-border" />
      <PendingEmployeeNumberNote />
    </div>
  )
}
