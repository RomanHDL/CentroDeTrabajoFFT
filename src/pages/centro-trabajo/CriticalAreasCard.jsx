import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getAllAreaSummaries } from '../../data/production/personnelByArea'

/* "Areas criticas" (2026-08-30, a peticion explicita del usuario, mockup
   descrito por texto -- sin imagen disponible, confirmado por el usuario
   que se proceda solo con la descripcion). Reemplaza a
   UnassignedPersonnelCard en esta pantalla (ver WorkAreaBottomSummary.jsx
   -- ese componente y getPeopleWithoutArea() NO se tocaron, solo dejaron
   de montarse aqui).

   Reusa getAllAreaSummaries() (personnelByArea.js) -- el mismo dataset
   que ya consume AreaCoverageSummaryCard ("Resumen por area") -- para no
   duplicar el calculo de headcount/ideal. La severidad se calcula aqui
   por % de cobertura (count/ideal), NO por cantidad absoluta faltante,
   tal como pidio el usuario explicitamente (Parte 10 del pedido).

   Colores: el usuario pidio "reusa la logica de color/estado ya
   existente, no inventes una paleta nueva" -- getAreaStatusMeta() solo
   define 2 colores de "falta" (FALTA #EF4444 rojo, PARCIAL #3B82F6 azul),
   no 4 tonos de severidad. Decision tomada aqui (marcada en el reporte
   al coordinador): Critica/Alta comparten rojo (#EF4444), Media/Baja
   comparten azul (#3B82F6) -- el ejemplo visual del usuario mostraba
   rojo/naranja/amarillo (3 tonos), que no existen en la paleta real del
   proyecto; se prioriza no inventar colores sobre igualar el mockup. */

const SEVERITY_BANDS = [
  { maxPct: 25, labelKey: 'severityCritical', color: '#EF4444' },
  { maxPct: 50, labelKey: 'severityHigh', color: '#EF4444' },
  { maxPct: 79, labelKey: 'severityMedium', color: '#3B82F6' },
  { maxPct: 99, labelKey: 'severityLow', color: '#3B82F6' },
]

function severityFor(pct) {
  return SEVERITY_BANDS.find((band) => pct <= band.maxPct) || null
}

/* Scroll suave + highlight temporal (~1s) hacia la card correspondiente
   en OperatingFloorPlan.jsx -- NUNCA cambia de ruta ni abre el Dialog de
   detalle existente (AreaDetailPanel), es solo navegacion interna dentro
   del mismo layout ya visible arriba. Los ids `area-${id}` se agregaron
   a BigZone/SupportCard/InsumosSuministroZone/FftBlock/ConveyorGeneralBar
   en OperatingFloorPlan.jsx -- si un area de getAllAreaSummaries no tiene
   card propia en el layout (ej. CALIDAD, sin representacion fisica desde
   2026-08-27), el elemento no existe y esto simplemente no hace nada. */
function scrollToArea(areaId) {
  const el = document.getElementById(`area-${areaId}`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
  el.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2', 'ring-offset-background')
  window.setTimeout(() => {
    el.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2', 'ring-offset-background')
  }, 1000)
}

export default function CriticalAreasCard() {
  const { t } = useTranslation('centroTrabajo')
  const version = usePersonnelVersion()
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza refrescar getAllAreaSummaries() cuando cambia el estado de personal, mismo patron que AreaCoverageSummaryCard.jsx
  const critical = useMemo(() => {
    return getAllAreaSummaries()
      .map((s) => {
        const ideal = s.ideal ?? null
        if (ideal == null || ideal <= 0) return null
        const pct = (s.count / ideal) * 100
        if (pct >= 100) return null
        const severity = severityFor(pct)
        if (!severity) return null
        return { ...s, ideal, pct, missing: ideal - s.count, severity }
      })
      .filter(Boolean)
      .sort((a, b) => a.pct - b.pct)
  }, [version])

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-2.5">
        <p className="text-[14.5px] font-extrabold">{t('criticalAreasCard.title')}</p>
        <p className="text-[11.5px] text-muted-foreground">{t('criticalAreasCard.subtitle')}</p>
      </div>

      {critical.length === 0 ? (
        <p className="text-[11.5px] italic text-muted-foreground">
          {t('criticalAreasCard.emptyMessage')}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {critical.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => scrollToArea(area.id)}
              className="flex w-full items-center gap-2 rounded-[14px] border border-border p-2 text-left transition-[box-shadow,background-color] duration-150 hover:bg-accent"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: area.severity.color }}
              />
              <span
                className="shrink-0 text-[10px] font-bold"
                style={{ color: area.severity.color }}
              >
                {t(`criticalAreasCard.${area.severity.labelKey}`)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{area.name}</span>
              <span className="shrink-0 text-[11.5px] font-extrabold">
                {area.count} / {area.ideal}
              </span>
              <span
                className="shrink-0 text-[10px] font-bold"
                style={{ color: area.severity.color }}
              >
                {t('areaCoverageSummaryCard.missingCount', { count: area.missing })}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
