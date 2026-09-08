import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cardClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { fetchLineStationConfig } from '../../data/personnel/lineStationConfig'
import { getLineWorkstationsWithOccupancy } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getAreaStaffing } from '../../data/production/personnelByArea'

/* Layout visual real de Sorting (2026-09-08, a peticion explicita del usuario -- pizarron a
   mano: RCY y FRM separadas por una entrada "E", una linea de 7 puestos DOBLES abajo ("van dos
   <-> asi, dos apuntan < y dos >" -- parejas de gente trabajando enfrentada), y aparte KITS,
   PNP, DMR/DML y DMA/DMT como 4 areas mas). A diferencia de OperatingFloorPlan.jsx (el plano de
   FFT, 1279 lineas de canvas pan/zoom con la geometria exacta de esa planta), este es
   deliberadamente un layout estatico simple -- Sorting arranca sin ese nivel de detalle fisico
   confirmado todavia; cada caja SI es real (datos reales via getAreaStaffing/
   getLineWorkstationsWithOccupancy, generico, mismo que usa cualquier otra area del catalogo) y
   clickeable hacia el mismo detalle (`onSelectArea`, igual patron que WorkAreaBottomSummary). */

const SIMPLE_AREAS = [
  { id: 'SORT_RCY', name: 'RCY' },
  { id: 'SORT_FRM', name: 'FRM' },
]
const SIDE_AREAS = [
  { id: 'SORT_KITS', name: 'KITS' },
  { id: 'SORT_DMR_DML', name: 'DMR / DML' },
  { id: 'SORT_PNP', name: 'PNP' },
  { id: 'SORT_DMA_DMT', name: 'DMA / DMT' },
]

function statusColor(staffing) {
  if (staffing.ideal == null) return '#94A3B8'
  if (staffing.real <= 0) return '#94A3B8'
  return staffing.status === 'COMPLETA' ? '#10B981' : '#EF4444'
}

function SimpleAreaBox({ area, onSelectArea, className }) {
  const { t } = useTranslation('centroTrabajo')
  const staffing = getAreaStaffing(area.id)
  const color = statusColor(staffing)
  return (
    <button
      type="button"
      onClick={() => onSelectArea(area.id)}
      className={cn(
        'flex min-h-[104px] flex-col items-start justify-between rounded-3xl border-2 p-6 text-left transition-colors hover:bg-accent',
        className,
      )}
      style={{ borderColor: color }}
    >
      <p className="text-lg font-extrabold">{area.name}</p>
      {staffing.ideal == null ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {staffing.real} {t('sortingFloorPlan.peopleSuffix')}
        </p>
      ) : (
        <p className="mt-1 text-base font-bold" style={{ color }}>
          {staffing.real} / {staffing.ideal}
        </p>
      )}
    </button>
  )
}

export default function SortingFloorPlan({ onSelectArea }) {
  const { t } = useTranslation('centroTrabajo')
  usePersonnelVersion()
  const [, setConfigVersion] = useState(0)

  // Los 7 puestos reales de SORT_LINEA viven en la BD (scripts/seed-sorting-work-areas-
  // 2026-09-08.mjs), pero getWorkstationsForLine() solo los usa si ya estan en cache
  // (lineStationConfig.js) -- mismo patron exacto que LineDetailDrawer.jsx al abrir una WC
  // LINEA. Sin este fetch, cae en el generador JS generico (1 solo puesto "catch-all") porque
  // SORT_LINEA no es parte de LINE_FAMILY_AREA_IDS ni tiene CUSTOM_STATION_PLANS.
  useEffect(() => {
    let cancelled = false
    fetchLineStationConfig('SORT_LINEA').then(() => {
      if (!cancelled) setConfigVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const lineaStaffing = getAreaStaffing('SORT_LINEA')
  const lineaColor = statusColor(lineaStaffing)
  const stations = getLineWorkstationsWithOccupancy('SORT_LINEA')

  return (
    <div className={cn(cardClass, 'p-8')}>
      <p className="mb-1 text-xl font-extrabold">{t('sortingFloorPlan.title')}</p>
      <p className="mb-6 text-sm text-muted-foreground">{t('sortingFloorPlan.subtitle')}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
            <SimpleAreaBox area={SIMPLE_AREAS[0]} onSelectArea={onSelectArea} />
            <div className="flex min-w-[64px] items-center justify-center rounded-2xl border border-dashed border-border px-4 text-xs font-bold uppercase text-muted-foreground">
              {t('sortingFloorPlan.entranceLabel')}
            </div>
            <SimpleAreaBox area={SIMPLE_AREAS[1]} onSelectArea={onSelectArea} />
          </div>

          <button
            type="button"
            onClick={() => onSelectArea('SORT_LINEA')}
            className="rounded-3xl border-2 p-6 text-left transition-colors hover:bg-accent"
            style={{ borderColor: lineaColor }}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-extrabold">{t('sortingFloorPlan.lineName')}</p>
              <p className="text-base font-bold" style={{ color: lineaColor }}>
                {lineaStaffing.real} / {lineaStaffing.ideal ?? '—'}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
              {stations.map((s, idx) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-xl border p-3 text-center text-sm',
                    s.occupants.length > 0
                      ? 'border-emerald-500/40 bg-emerald-500/[0.08]'
                      : 'border-border bg-black/[.02] dark:bg-white/[.03]',
                  )}
                >
                  <p className="font-bold text-muted-foreground">{idx + 1}</p>
                  {s.occupants.length > 0 ? (
                    s.occupants.map((o) => (
                      <p key={o.employeeId} className="w-full truncate font-semibold">
                        {o.employee?.name || '—'}
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground/70">{t('sortingFloorPlan.vacantLabel')}</p>
                  )}
                </div>
              ))}
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SIDE_AREAS.map((area) => (
            <SimpleAreaBox
              key={area.id}
              area={area}
              onSelectArea={onSelectArea}
              className="h-full"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
