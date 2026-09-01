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
          {MONTH_KEYS.map((m) => (
            <TableCell key={m} className={cn(cellTextClass, 'text-right')}>
              {row.months[m] || t('emptyValuePlaceholder')}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
