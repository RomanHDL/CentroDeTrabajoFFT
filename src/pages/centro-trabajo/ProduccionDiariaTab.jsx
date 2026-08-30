import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  kpiCardClass,
  metricChipClass,
  sectionTitleClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { getPersonnelCountForDate } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { dailyHourlyTotal, dailyLineBreakdown } from '../../data/production/production'
import { progressTone } from '../../data/production/selectors'
import HourlyTrendChart from './HourlyTrendChart'

export default function ProduccionDiariaTab() {
  const personnelVersion = usePersonnelVersion()
  const [dateISO, setDateISO] = useState(dayjs().format('YYYY-MM-DD'))

  const lines = useMemo(() => dailyLineBreakdown(dateISO), [dateISO])
  const hourly = useMemo(() => dailyHourlyTotal(dateISO), [dateISO])
  // biome-ignore lint/correctness/useExhaustiveDependencies: personnelVersion fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const personalUtilizado = useMemo(
    () => getPersonnelCountForDate(dateISO),
    [dateISO, personnelVersion],
  )

  const totals = lines.reduce(
    (acc, r) => ({
      production: acc.production + r.production,
      target: acc.target + r.target,
    }),
    { production: 0, target: 0 },
  )
  // Se conserva el calculo aunque hoy no se despliegue (no habia consumidor
  // en el original MUI tampoco) -- solo se prefija con "_" para satisfacer
  // el lint de variable no usada sin borrar la logica de negocio.
  const _cumplimiento =
    totals.target > 0 ? Math.round((totals.production / totals.target) * 100) : 0
  const diferencia = totals.production - totals.target

  return (
    <div>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className={sectionTitleClass}>Producción diaria</p>
        <div className="flex-1" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="produccion-diaria-fecha" className="text-xs text-muted-foreground">
            Seleccionar fecha
          </Label>
          <Input
            id="produccion-diaria-fecha"
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value || dayjs().format('YYYY-MM-DD'))}
            className="h-9 w-full bg-card sm:w-[200px]"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={kpiCardClass('blue')}>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Producción total</p>
          <p className="mt-1 text-2xl font-extrabold">
            {totals.production.toLocaleString('es-MX')}
          </p>
        </div>
        <div className={kpiCardClass('cyan')}>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Meta</p>
          <p className="mt-1 text-2xl font-extrabold">{totals.target.toLocaleString('es-MX')}</p>
        </div>
        <div className={kpiCardClass(diferencia >= 0 ? 'green' : 'red')}>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Diferencia</p>
          <p className="mt-1 text-2xl font-extrabold">
            {diferencia >= 0 ? '+' : ''}
            {diferencia.toLocaleString('es-MX')}
          </p>
        </div>
        <div className={kpiCardClass('purple')}>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">
            Personal utilizado
          </p>
          <p className="mt-1 text-2xl font-extrabold">{personalUtilizado}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <p className={cardHeaderTitleClass}>Producción por línea</p>
            <p className={cardHeaderSubtitleClass}>{dayjs(dateISO).format('DD/MM/YYYY')}</p>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className={tableHeaderRowClass}>
                  <TableHead>Línea</TableHead>
                  <TableHead className="text-right">Producción</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Avance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((r, idx) => {
                  const tone = progressTone(r.cumplimiento)
                  return (
                    <TableRow key={r.id} className={tableRowClass(idx)}>
                      <TableCell className={cn(cellTextClass, 'font-semibold')}>{r.name}</TableCell>
                      <TableCell className={cn(cellTextClass, 'text-right')}>
                        {r.production.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell className={cn(cellTextSecondaryClass, 'text-right')}>
                        {r.target.toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={metricChipClass(tone.tone)}>{r.cumplimiento}%</span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <p className={cardHeaderTitleClass}>Producción por hora</p>
            <p className={cardHeaderSubtitleClass}>Total de todas las líneas</p>
          </div>
          <div className="p-4">
            <HourlyTrendChart data={hourly} height={340} />
          </div>
        </div>
      </div>
    </div>
  )
}
