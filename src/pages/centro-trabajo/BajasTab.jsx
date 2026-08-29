import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
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
  statusChipClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { getBajaEmployees } from '../../data/personnel/repository'
import { EmptyState } from '../../ui'

/* Personal ya no asignable (2026-08-24, a peticion explicita del
   usuario): las 8 personas marcadas status "BAJA" en
   realPersonnelSnapshot.js -- antes simplemente no aparecian en
   ningun lado (ni layout, ni busqueda, ni aqui); ahora tienen esta
   pestaña de solo lectura para que quede documentado que existen y
   por que ya no se les puede asignar. getAssignableEmployees()/
   searchEmployees() ya las excluye automaticamente via el campo
   `eligible` de directory.js -- esta pestaña NO cambia esa exclusion,
   solo la hace visible en vez de silenciosa. Nunca se ofrece
   asignar/mover/registrar desde aqui.

   Fase 6c (Centro de Trabajo, primer lote): portado de MUI a Tailwind. */
export default function BajasTab() {
  const [query, setQuery] = useState('')

  const baja = useMemo(() => getBajaEmployees(), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baja
    return baja.filter(
      (e) => e.name.toLowerCase().includes(q) || e.employeeNumber.toLowerCase().includes(q),
    )
  }, [baja, query])

  return (
    <div className={`${cardClass} mt-4`}>
      <div className={cardHeaderClass}>
        <div>
          <p className={cardHeaderTitleClass}>Personal no asignable</p>
          <p className={cardHeaderSubtitleClass}>
            Personal marcado como baja — no se puede registrar, mover ni asignar a ninguna estación
          </p>
        </div>
      </div>
      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50" />
          <Input
            placeholder="Buscar por nombre o número..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-card pl-10"
          />
        </div>
      </div>
      <div className="mt-2 max-h-[560px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className={tableHeaderRowClass}>
              <TableHead>Empleado</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Última área/puesto conocido</TableHead>
              <TableHead>Fecha de ingreso</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e, idx) => (
              <TableRow key={e.id} className={tableRowClass(idx)}>
                <TableCell className={`${cellTextClass} font-mono font-semibold`}>
                  {e.employeeNumber}
                </TableCell>
                <TableCell className={cellTextClass}>{e.name}</TableCell>
                <TableCell className={cellTextSecondaryClass}>{e.areaHistorica || '—'}</TableCell>
                <TableCell className={cellTextSecondaryClass}>{e.fechaIngreso || '—'}</TableCell>
                <TableCell>
                  <span className={statusChipClass('CANCELADA')}>Baja</span>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    compact
                    title="Sin resultados"
                    description="Nadie coincide con esta búsqueda."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
