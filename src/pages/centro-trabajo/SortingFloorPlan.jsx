import { Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cardClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { fetchLineStationConfig } from '../../data/personnel/lineStationConfig'
import { getLineWorkstationsWithOccupancy } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getAreaStaffing } from '../../data/production/personnelByArea'

/* Layout visual real de Sorting (2026-09-08, a peticion explicita del usuario -- pizarron a
   mano: RCY y FRM separadas por una entrada "E", una linea de 7 "V" abajo (pallets arriba, cada V
   con 2 personas en un extremo y 2 en el otro -- 4 por linea), y aparte KITS/PATINES/DMR-DML en
   una fila y PNP/Gerente de Sorting/DMA-DMT en otra. A diferencia de OperatingFloorPlan.jsx (el
   plano de FFT, 1279 lineas de canvas pan/zoom con la geometria exacta de esa planta), este es
   deliberadamente un layout estatico simple -- Sorting arranca sin ese nivel de detalle fisico
   confirmado todavia; cada caja SI es real (datos reales via getAreaStaffing/
   getLineWorkstationsWithOccupancy, generico, mismo que usa cualquier otra area del catalogo) y
   clickeable hacia el mismo detalle (`onSelectArea`, igual patron que WorkAreaBottomSummary).

   2026-09-08 (segunda ronda, viendo el layout en vivo): se agregan las 2 areas que faltaban
   ("Patines" en medio de KITS/PNP, "Gerente de Sorting" -- cuadro chico, area de apoyo -- en
   medio de DMR-DML/DMA-DMT) y se corrige la capacidad real de SORT_LINEA de 2 a 4 personas por
   estacion (ver catalogSorting.js y scripts/update-sort-linea-capacity-2026-09-08.mjs). */

const SIMPLE_AREAS = [
  { id: 'SORT_RCY', name: 'RCY' },
  { id: 'SORT_FRM', name: 'FRM' },
]
// 2026-09-08 (tercera ronda -- a peticion explicita del usuario, foto real del pizarron para
// esta seccion especifica): KITS/DMR-DML arriba y PNP/DMA-DMT abajo son las 4 areas grandes de
// siempre; Patines (mediano) y Gerente de Sorting (chico) van juntos en una franja angosta entre
// esas dos filas, del lado izquierdo -- DMA/DMT ocupa esa misma altura del lado derecho (crece
// hacia abajo en vez de tener su propia franja), tal cual el dibujo. Layout armado con
// grid-template-areas (ver JSX) en vez de un grid uniforme 3x2 -- por eso KITS/DMR-DML/PNP/DMA-
// DMT no llevan `size` (grandes, tamaño de siempre) y solo Patines/Gerente son mas chicos.
const KITS = { id: 'SORT_KITS', name: 'KITS' }
const DMR_DML = { id: 'SORT_DMR_DML', name: 'DMR / DML' }
const PNP = { id: 'SORT_PNP', name: 'PNP' }
const DMA_DMT = { id: 'SORT_DMA_DMT', name: 'DMA / DMT' }
const PATINES = { id: 'SORT_PATINES', name: 'Patines', size: 'medium' }
const GERENTE = { id: 'SORT_GERENTE', name: 'Gerente de Sorting', size: 'small' }

function statusColor(staffing) {
  if (staffing.ideal == null) return '#94A3B8'
  if (staffing.real <= 0) return '#94A3B8'
  return staffing.status === 'COMPLETA' ? '#10B981' : '#EF4444'
}

const SIZE_CLASSES = {
  small: { box: 'min-h-[56px] p-3', title: 'text-xs font-extrabold', value: 'text-xs' },
  medium: { box: 'min-h-[76px] p-4', title: 'text-sm font-extrabold', value: 'text-sm' },
  large: { box: 'min-h-[104px] p-6', title: 'text-lg font-extrabold', value: 'text-base' },
}

function SimpleAreaBox({ area, onSelectArea, className, style }) {
  const { t } = useTranslation('centroTrabajo')
  const staffing = getAreaStaffing(area.id)
  const color = statusColor(staffing)
  const sizeClasses = SIZE_CLASSES[area.size || 'large']
  return (
    <button
      type="button"
      onClick={() => onSelectArea(area.id)}
      className={cn(
        'flex flex-col items-start justify-between rounded-3xl border-2 text-left transition-colors hover:bg-accent',
        sizeClasses.box,
        className,
      )}
      style={{ borderColor: color, ...style }}
    >
      <p className={sizeClasses.title}>{area.name}</p>
      {staffing.ideal == null ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {staffing.real} {t('sortingFloorPlan.peopleSuffix')}
        </p>
      ) : (
        <p className={cn('mt-1 font-bold', sizeClasses.value)} style={{ color }}>
          {staffing.real} / {staffing.ideal}
        </p>
      )}
    </button>
  )
}

// Una "V" real: 2 personas en el extremo izquierdo, 2 en el derecho, convergiendo hacia el pallet
// -- ver comentario de arriba. occupants ya viene ordenado por checkInAt (repository.js).
function VLineStation({ station, index }) {
  const { t } = useTranslation('centroTrabajo')
  const left = station.occupants.slice(0, 2)
  const right = station.occupants.slice(2, 4)
  const hasPeople = station.occupants.length > 0
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-[12px]',
        hasPeople
          ? 'border-emerald-500/40 bg-emerald-500/[0.08]'
          : 'border-border bg-black/[.02] dark:bg-white/[.03]',
      )}
    >
      <div
        className="grid h-6 w-6 place-items-center rounded-md border border-dashed border-border/70 text-muted-foreground/70"
        title={t('sortingFloorPlan.palletLabel')}
      >
        <Package className="h-3.5 w-3.5" />
      </div>
      {/* V (abre hacia arriba) + tramo vertical BIEN visible + V invertida "parada" (la punta
          hacia arriba, abre hacia abajo) -- a peticion explicita del usuario tras ver el primer
          intento ("no es v una linea vertical y otra v parada la punta de la v invertida"): el
          primer intento tenia el tramo vertical demasiado corto y se veia como una sola X. Dos
          polylines simetricas que comparten los 2 puntos centrales (24,14) y (24,38), separados
          24 unidades para que la linea vertical se lea como un tramo propio, no una bisagra. */}
      <svg
        viewBox="0 0 48 56"
        className="h-10 w-12 text-muted-foreground/60"
        aria-hidden="true"
        role="presentation"
      >
        <polyline
          points="4,2 24,14 24,38 4,50"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="44,2 24,14 24,38 44,50"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="font-bold text-muted-foreground">{index + 1}</p>
      <div className="grid w-full grid-cols-2 gap-1">
        <div className="flex flex-col gap-0.5 border-r border-dashed border-border/70 pr-1">
          {left.length > 0 ? (
            left.map((o) => (
              <p key={o.employeeId} className="truncate font-semibold">
                {o.employee?.name || '—'}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground/70">{t('sortingFloorPlan.vacantLabel')}</p>
          )}
        </div>
        <div className="flex flex-col gap-0.5 pl-1">
          {right.length > 0 ? (
            right.map((o) => (
              <p key={o.employeeId} className="truncate font-semibold">
                {o.employee?.name || '—'}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground/70">{t('sortingFloorPlan.vacantLabel')}</p>
          )}
        </div>
      </div>
    </div>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_460px]">
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
                <VLineStation key={s.id} station={s} index={idx} />
              ))}
            </div>
          </button>
        </div>

        <div
          className="grid grid-cols-2 grid-rows-[auto_auto_auto] gap-3"
          style={{ gridTemplateAreas: '"kits dmrdml" "mid dmadmt" "pnp dmadmt"' }}
        >
          <SimpleAreaBox
            area={KITS}
            onSelectArea={onSelectArea}
            className="h-full"
            style={{ gridArea: 'kits' }}
          />
          <SimpleAreaBox
            area={DMR_DML}
            onSelectArea={onSelectArea}
            className="h-full"
            style={{ gridArea: 'dmrdml' }}
          />
          <div className="flex gap-2" style={{ gridArea: 'mid' }}>
            <SimpleAreaBox area={PATINES} onSelectArea={onSelectArea} className="flex-1" />
            <SimpleAreaBox area={GERENTE} onSelectArea={onSelectArea} className="w-20 shrink-0" />
          </div>
          <SimpleAreaBox
            area={PNP}
            onSelectArea={onSelectArea}
            className="h-full"
            style={{ gridArea: 'pnp' }}
          />
          <SimpleAreaBox
            area={DMA_DMT}
            onSelectArea={onSelectArea}
            className="h-full"
            style={{ gridArea: 'dmadmt' }}
          />
        </div>
      </div>
    </div>
  )
}
