import { Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { searchEmployees } from '../../data/personnel/repository'
import EmployeeAvatar from './EmployeeAvatar'

/**
 * Buscador de empleado por numero O nombre (Autocomplete
 * libre): escribes "3647" o "Román" y ambos funcionan. No
 * exige conocer el numero de memoria.
 *
 * Fase 6c: MUI Autocomplete no tiene primitiva shadcn equivalente en
 * este repo (cmdk queda fuera de alcance -- mismo criterio ya usado en
 * UserModulePermissionsCard): reemplazo minimo con Popover controlado +
 * Input + lista filtrada de botones. No hay navegacion por teclado
 * (autoHighlight/flechas) como en MUI, solo click; el contrato
 * onChange(selected, typedText) se conserva identico.
 */
export default function EmployeeSearchField({ label, value, onChange, autoFocus }) {
  const { t } = useTranslation('centroTrabajo')
  const resolvedLabel = label ?? t('employeeSearchField.defaultLabel')
  const id = useId()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value?.employeeNumber || '')
  const options = useMemo(() => searchEmployees(inputValue), [inputValue])

  function selectOption(opt) {
    setInputValue(opt.employeeNumber)
    onChange(opt, opt.employeeNumber)
    setOpen(false)
  }

  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-xs">
        {resolvedLabel}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50" />
            <Input
              id={id}
              autoFocus={autoFocus}
              placeholder={t('employeeSearchField.searchPlaceholder')}
              value={inputValue}
              className="pl-10"
              onChange={(e) => {
                const newValue = e.target.value
                setInputValue(newValue)
                setOpen(true)
                onChange(null, newValue)
              }}
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="max-h-64 w-[var(--radix-popper-anchor-width)] overflow-y-auto p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t('employeeSearchField.noResults')}
            </p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => selectOption(option)}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
              >
                <EmployeeAvatar employee={option} size={32} />
                <div>
                  <p className="text-[13.5px] font-bold">
                    {option.employeeNumber} — {option.name}
                  </p>
                  {option.fechaIngreso && (
                    <p className="text-[11.5px] opacity-60">
                      {t('employeeSearchField.admissionDate', { date: option.fechaIngreso })}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
