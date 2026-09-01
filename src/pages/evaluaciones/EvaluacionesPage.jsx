import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  alertToneClass,
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
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { workCenterById } from '../../data/production/catalog'
import { EmptyState } from '../../ui'

/* Modulo Evaluaciones (2026-09-02, a peticion explicita del usuario --
   "quiero un nuevo modulo evaluaciones que este un layout y que este
   nomas las calificaciones de la evaluacion que se hizo cuando lo haya
   auditado"): SOLO LECTURA. Lista lo que FiveSDialog (AuditoriaPage.jsx)
   ya guardo via POST /api/evaluaciones en AuditEvaluation (ver
   server-lib/db/schema.js). Nunca formularios, edicion, borrado ni
   exportacion aqui -- nada de eso se pidio. */

const CLASSIFICATION_TONE = {
  CUMPLE: 'ok',
  CUMPLE_PARCIAL: 'warn',
  NO_CUMPLE: 'bad',
}

const STEPS = ['s1', 's2', 's3', 's4', 's5']

// Semaforo simple SOLO como ayuda visual (umbrales pedidos explicitamente
// por el usuario: verde >=80, ambar 50-79, rojo <50) -- ningun otro
// umbral de negocio se inventa.
function scoreTone(scorePct) {
  if (scorePct >= 80) return 'ok'
  if (scorePct >= 50) return 'warn'
  return 'bad'
}

export default function EvaluacionesPage() {
  const { t } = useTranslation('evaluaciones')
  const [evaluations, setEvaluations] = useState(null) // null = cargando todavia
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/evaluaciones', { credentials: 'include' })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error((data && data.error) || t('loadErrorGeneric'))
        if (!cancelled) setEvaluations(data.evaluations || [])
      } catch (e) {
        if (!cancelled) setError(e.message || t('loadErrorGeneric'))
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className={pageClass}>
      <div className={cn(cardClass, 'mb-4')}>
        <div className="border-b border-border bg-black/[.015] px-5 py-3.5 dark:bg-white/[.02]">
          <p className={pageTitleClass}>{t('pageTitle')}</p>
          <p className={pageSubtitleClass}>{t('pageSubtitle')}</p>
        </div>
      </div>

      {error && <Alert className={cn(alertToneClass('error'), 'mb-4')}>{error}</Alert>}

      <div className={cardClass}>
        <div className={cardHeaderClass}>
          <div className="min-w-0 flex-1">
            <p className={cardHeaderTitleClass}>{t('tableTitle')}</p>
            <p className={cardHeaderSubtitleClass}>{t('tableSubtitle')}</p>
          </div>
        </div>

        {evaluations === null && !error && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {t('loadingMessage')}
          </p>
        )}

        {evaluations && evaluations.length === 0 && (
          <EmptyState title={t('emptyStateTitle')} description={t('emptyStateDescription')} />
        )}

        {evaluations && evaluations.length > 0 && (
          <div className="max-h-[75vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className={tableHeaderRowClass}>
                  <TableHead>{t('colEmployee')}</TableHead>
                  <TableHead>{t('colArea')}</TableHead>
                  <TableHead>{t('colStation')}</TableHead>
                  <TableHead>{t('colDate')}</TableHead>
                  {STEPS.map((s) => (
                    <TableHead key={s} className="text-center">
                      {s.toUpperCase()}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">{t('colScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((ev, idx) => (
                  <TableRow key={ev.id} className={tableRowClass(idx)}>
                    <TableCell className={cn(cellTextClass, 'font-bold')}>
                      {ev.employeeName}
                      <div className={cn(cellTextSecondaryClass, 'font-normal')}>
                        {formatEmployeeNumber(ev.employeeNumber)}
                      </div>
                    </TableCell>
                    <TableCell className={cellTextSecondaryClass}>
                      {workCenterById(ev.areaId)?.name || ev.areaId}
                    </TableCell>
                    <TableCell className={cellTextSecondaryClass}>{ev.stationName}</TableCell>
                    <TableCell className={cellTextSecondaryClass}>
                      {dayjs(ev.auditDate).format('DD/MM/YYYY')}
                    </TableCell>
                    {STEPS.map((s) => (
                      <TableCell key={s} className="text-center">
                        <span className={metricChipClass(CLASSIFICATION_TONE[ev[s]] || 'default')}>
                          {t(`classificationShort.${ev[s]}`, ev[s])}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <span className={metricChipClass(scoreTone(ev.scorePct))}>{ev.scorePct}%</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
