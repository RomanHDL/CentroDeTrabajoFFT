import { Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { getCurrentAssignment, searchEmployees } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { workCenterById } from '../../data/production/catalog'
import { getEffectiveAreaForEmployee } from '../../data/production/personnelByArea'
import { useDndAssign } from '../../state/dndAssign'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Buscador de empleado por numero o nombre, para asignar/mover
   rapido a `areaId` sin depender del drag (importante en tablet).
   Reutiliza exactamente searchEmployees (ya filtra bajas/no
   elegibles — ver directory.js/repository.js) y requestAssign de
   DndAssignProvider — la MISMA logica que ya usa el drag & drop,
   nunca un tercer camino de asignacion.

   2026-09-02 (a peticion explicita del usuario, "Cambiar personal" en
   WC LINEA -- ver LineProcessFlow.jsx): prop opcional `stationName`.
   Sin ella, se comporta exactamente igual que siempre (requestAssign,
   abre el picker de estacion si el area tiene varias). Con ella, ya
   se sabe a que puesto especifico se quiere asignar/mover a la
   persona elegida -- se llama requestAssignToStation en su lugar
   (misma logica de swap/bump ya probada que usa el drag & drop sobre
   una estacion puntual, ver dndAssign.jsx). */
export default function EmployeeAssignSearchBar({ areaId, stationName }) {
  const { t } = useTranslation('centroTrabajo')
  const [query, setQuery] = useState('')
  usePersonnelVersion()
  const dnd = useDndAssign()
  const results = query.trim() ? searchEmployees(query, 8) : []

  function handlePick(employee) {
    if (stationName) dnd.requestAssignToStation(employee.id, areaId, stationName)
    else dnd.requestAssign(employee.id, areaId)
    setQuery('')
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground opacity-50" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('employeeAssignSearchBar.searchPlaceholder')}
        className="h-auto rounded-[25px] py-[11.2px] pl-9 text-[15px]"
      />

      {query.trim() && (
        <div className="absolute z-20 mt-1 max-h-[320px] w-full overflow-y-auto rounded-[20px] border border-border bg-card shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-[13px] text-muted-foreground">
              {t('employeeAssignSearchBar.noResults')}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {results.map((employee) => {
                const current = getCurrentAssignment(employee.id)
                const effectiveAreaId = current?.areaId ?? getEffectiveAreaForEmployee(employee.id)
                // Con stationName (puesto especifico, ver comentario arriba): "ya esta
                // aqui" solo aplica si ya ocupa ESE puesto, no solo la misma linea --
                // si no, bloquearia mover a alguien de Montaje a Empaque dentro de la
                // misma WC LINEA (mismo areaId, puesto distinto).
                const sameArea = stationName
                  ? current?.areaId === areaId && current?.stationId === stationName
                  : effectiveAreaId === areaId
                const formattedNumber = formatEmployeeNumber(employee.employeeNumber)
                const numberLabel =
                  formattedNumber === 'PROYECTO' ? 'PROYECTO' : `#${formattedNumber}`
                return (
                  <div key={employee.id} className="flex items-center gap-3 p-3">
                    <EmployeeAvatar employee={employee} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{employee.name}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {numberLabel} ·{' '}
                        {effectiveAreaId
                          ? t('employeeAssignSearchBar.currentlyAt', {
                              areaName: workCenterById(effectiveAreaId)?.name || effectiveAreaId,
                            })
                          : t('employeeAssignSearchBar.unassigned')}
                      </p>
                    </div>
                    {sameArea ? (
                      <Badge variant="secondary" className="font-bold">
                        {t('employeeAssignSearchBar.alreadyHereBadge')}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePick(employee)}
                        className="shrink-0 font-bold"
                      >
                        {current
                          ? t('employeeAssignSearchBar.moveHereButton')
                          : t('employeeAssignSearchBar.assignButton')}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
