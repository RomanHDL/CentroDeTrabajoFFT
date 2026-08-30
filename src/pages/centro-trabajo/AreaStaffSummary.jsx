import { useTranslation } from 'react-i18next'
import { cardClass, sectionTitleClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────
   "Resumen del área" (2026-08-28, "REFINAMIENTO VISUAL Grupo C", a
   peticion explicita del usuario, Seccion 13C) -- SOLO la usa
   LineLikeAreaDetail.jsx. `groups` = los mismos `stationGroups` ya
   calculados ahi (getPersonnelRank/rankSystem.js, cada grupo con su
   `label` de categoria y sus estaciones reales) -- nunca un calculo
   paralelo. `total`/`ideal`/`diff` = los mismos numeros que ya muestran
   los KPIs de arriba (staffing.real/ideal/diff), nunca inventados aqui. */
export default function AreaStaffSummary({ groups, total, ideal, diff }) {
  const { t } = useTranslation('centroTrabajo')
  return (
    <div className={cn(cardClass, 'p-4')}>
      <p className={cn(sectionTitleClass, 'mb-2.5 text-[13.5px]')}>{t('areaStaffSummary.title')}</p>
      <div className="flex flex-col gap-[6.8px]">
        {groups.map((g) => (
          <div key={g.key} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
            <p className="flex-1 truncate text-[12.5px]">{g.label}</p>
            <span className="text-[12.5px] font-bold">
              {g.occupied} / {g.total}
            </span>
          </div>
        ))}
      </div>
      {ideal != null && (
        <>
          <div className="my-2.5 border-t border-border" />
          <div className="flex items-center gap-2">
            <p className="flex-1 text-[12.5px] font-extrabold">
              {t('areaStaffSummary.totalAssigned')}
            </p>
            <span className="text-[12.5px] font-extrabold">
              {total} / {ideal}
            </span>
          </div>
          {diff < 0 && (
            <div className="mt-1 flex items-center gap-2">
              <p className="flex-1 text-xs text-[#EF4444]">
                {t('areaStaffSummary.missingCoverage')}
              </p>
              <span className="text-xs font-bold text-[#EF4444]">{Math.abs(diff)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
