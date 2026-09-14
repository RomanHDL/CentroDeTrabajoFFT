import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/*
  Ventana flotante de Rol/Estación (2026-09-14, a petición explícita del usuario -- "ya no
  quiero el dropdown tradicional... quiero una ventana flotante sencilla, NO gigante, NO un
  wizard"): reutiliza el mismo <Dialog> (@/components/ui/dialog) que ya usa el resto de la app
  en vez de introducir un componente nuevo -- solo con clases responsivas para que en pantallas
  angostas (escáner industrial/celular) se comporte como "bottom sheet" (pegado abajo, esquinas
  redondeadas arriba, alto máximo con scroll interno) y en tablet/laptop/monitor quede como un
  panel compacto centrado ("centrado como modal", explícitamente permitido por el propio pedido).

  Selección en 2 pasos, tal como lo pidió el usuario en su mockup (tarjetas con radio + botón
  "Confirmar selección" al final): elegir una tarjeta solo cambia la marca VISUAL (`pendingName`)
  -- cerrar sin confirmar (X, click fuera, ESC) descarta el cambio, igual que cancelar. La lista
  de estaciones/ocupación/compatibilidad viene YA CALCULADA desde RegisterPersonnelForm.jsx
  (mismas funciones de siempre: getStationOccupancy/hasSkill) -- este componente es puramente de
  presentación, no toca lógica de negocio.

  IMPORTANTE (contrato existente, NO tocar): `value`/`onConfirm` viajan por el NOMBRE de la
  estación (`form.stationId` en RegisterPersonnelForm.jsx SIEMPRE guarda el nombre, ej. "Team
  Leader" -- ver workstations.js), nunca el `id` interno del slot (ej. "PALETIZADO-4"). `s.id`
  solo se usa como key de React/identificador de tarjeta; la selección real se seguimiento por
  `s.name`.
*/
export default function StationPickerDialog({
  open,
  onClose,
  areaName,
  lineName,
  stations,
  value,
  onConfirm,
}) {
  const { t } = useTranslation('centroTrabajo')
  const [pendingName, setPendingName] = useState(value)

  useEffect(() => {
    if (open) setPendingName(value)
  }, [open, value])

  const handleConfirm = () => {
    if (!pendingName) return
    onConfirm(pendingName)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="inset-x-0 bottom-0 top-auto left-0 max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-[24px] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-full sm:max-w-[420px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px]">
        <DialogHeader className="flex-col items-start justify-start gap-0.5 pb-2">
          <div className="flex w-full items-center justify-between">
            <DialogTitle>{t('registerPersonnelForm.stationPickerTitle')}</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t('registerPersonnelForm.closeButton')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
          <p className="truncate text-[12px] font-medium text-muted-foreground">
            {lineName ? `${areaName} › ${lineName}` : areaName}
          </p>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-2 overflow-y-auto px-6 pb-2 sm:max-h-[50vh]">
          {stations.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('registerPersonnelForm.stationPickerEmpty')}
            </p>
          )}
          {stations.map((s) => {
            const selected = pendingName === s.name
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={selected}
                disabled={s.isFull}
                onClick={() => setPendingName(s.name)}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  s.isFull
                    ? 'cursor-not-allowed border-border/60 opacity-50'
                    : selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent',
                )}
              >
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2',
                    selected ? 'border-primary' : 'border-muted-foreground/40',
                  )}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.name}</span>
                  <span
                    className={cn(
                      'block text-[12px]',
                      s.isFull ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {s.count}/{s.capacity}
                    {s.isFull
                      ? t('registerPersonnelForm.stationFullSuffix')
                      : t('registerPersonnelForm.stationAvailableSuffix')}
                  </span>
                  {s.compatible && (
                    <span className="block text-[11px] text-emerald-600 dark:text-emerald-400">
                      {t('registerPersonnelForm.compatibleSkillSuffix')}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex justify-end px-6 py-4">
          <Button
            onClick={handleConfirm}
            disabled={!pendingName}
            className="w-full font-bold sm:w-auto"
          >
            {t('registerPersonnelForm.stationPickerConfirmButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
