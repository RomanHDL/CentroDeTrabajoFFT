import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  cellTextClass,
  cellTextSecondaryClass,
  pageClass,
  pageSubtitleClass,
  pageTitleClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { KPI_HISTORICO_2017 } from '../../data/kpis/kpiHistorico2017'

/* ─────────────────────────────────────────────
   Modulo KPI's (2026-09-01, a peticion explicita del usuario) -- antes
   era una pagina "Proximamente" (ComingSoonPage). Primera tabla real
   importada tal cual de "KPI's MI TECHNOLOGIES GENERAL.xlsx" (hoja
   "KPI", ver src/data/kpis/kpiHistorico2017.js para el detalle completo
   de la extraccion) -- nunca se inventa ni se corrige un valor, se
   transcribe 1:1 del Excel real, agrupada por area tal como viene en la
   hoja fuente. Los meses sin dato en el Excel original se muestran como
   "—" (el reporte real nunca se lleno para ese mes, no es un error de
   esta pagina). */

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

/* Semaforo real (2026-09-01, segunda ronda -- "debe ser exactamente igual
   al excel, los colores y todo"): reproduce la regla de formato
   condicional REAL del Excel (iconSet "3Symbols2" sobre las columnas de
   mes de cada fila, comparado contra el Target Max/Min de esa MISMA
   fila -- ver src/data/kpis/kpiHistorico2017.js, campo "reverse",
   extraido del XML crudo del archivo, nunca inventado). No es una
   replica pixel-por-pixel del icono de Excel (esta libreria no renderiza
   iconSets), pero SI usa los mismos umbrales reales y la misma bandera
   real de inversion de cada fila -- rojo/amarillo/verde con la misma
   logica de negocio. reverse=null (filas de Contraloria, sin regla en
   el Excel original) -- no se colorea, se muestra el valor tal cual. */
function parseNumeric(value) {
  const cleaned = (value || '').replace('%', '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

function trafficLightColor(row, monthValue) {
  if (row.reverse === null) return null
  const value = parseNumeric(monthValue)
  const max = parseNumeric(row.targetMax)
  const min = parseNumeric(row.targetMin)
  if (value === null || max === null || min === null) return null
  const lo = Math.min(max, min)
  const hi = Math.max(max, min)
  let zone
  if (value < lo) zone = 'low'
  else if (value < hi) zone = 'mid'
  else zone = 'high'
  const colorByZone = row.reverse
    ? { low: '#10B981', mid: '#F59E0B', high: '#EF4444' }
    : { low: '#EF4444', mid: '#F59E0B', high: '#10B981' }
  return colorByZone[zone]
}

export default function KpisPage() {
  const { t } = useTranslation('kpis')

  const groups = []
  const byArea = new Map()
  for (const row of KPI_HISTORICO_2017) {
    if (!byArea.has(row.area)) {
      const group = { area: row.area, rows: [] }
      byArea.set(row.area, group)
      groups.push(group)
    }
    byArea.get(row.area).rows.push(row)
  }

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
        <div className="max-h-[75vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className={tableHeaderRowClass}>
                <TableHead>{t('colNumber')}</TableHead>
                <TableHead>{t('colIndicator')}</TableHead>
                <TableHead>{t('colDescription')}</TableHead>
                <TableHead>{t('colTargetMax')}</TableHead>
                <TableHead>{t('colTargetMin')}</TableHead>
                <TableHead>{t('colUnit')}</TableHead>
                {MONTH_KEYS.map((m) => (
                  <TableHead key={m} className="text-right">
                    {t(`month${m[0].toUpperCase()}${m.slice(1)}`)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <FragmentGroup key={group.area} group={group} t={t} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function FragmentGroup({ group, t }) {
  return (
    <>
      <TableRow className="border-b border-border bg-black/[.025] dark:bg-white/[.035]">
        <TableCell colSpan={6 + MONTH_KEYS.length} className="py-2 text-[12px] font-extrabold">
          {group.area}
        </TableCell>
      </TableRow>
      {group.rows.map((row, idx) => (
        <TableRow key={`${group.area}-${row.number || idx}`} className={tableRowClass(idx)}>
          <TableCell className={cn(cellTextSecondaryClass, 'font-mono')}>{row.number}</TableCell>
          <TableCell className={cn(cellTextClass, 'font-bold')}>{row.indicator}</TableCell>
          <TableCell className={cellTextSecondaryClass}>{row.description}</TableCell>
          <TableCell className={cellTextSecondaryClass}>{row.targetMax}</TableCell>
          <TableCell className={cellTextSecondaryClass}>{row.targetMin}</TableCell>
          <TableCell className={cellTextSecondaryClass}>{row.unit}</TableCell>
          {MONTH_KEYS.map((m) => {
            const color = trafficLightColor(row, row.months[m])
            return (
              <TableCell key={m} className={cn(cellTextClass, 'text-right')}>
                {row.months[m] ? (
                  <span className="inline-flex items-center justify-end gap-1.5">
                    {color && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    {row.months[m]}
                  </span>
                ) : (
                  t('emptyValuePlaceholder')
                )}
              </TableCell>
            )
          })}
        </TableRow>
      ))}
    </>
  )
}
