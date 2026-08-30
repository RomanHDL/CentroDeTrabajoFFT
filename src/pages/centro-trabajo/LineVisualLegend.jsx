import { Award, Package, Settings, Shield, User, Wrench } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { LINE_VISUAL_TYPE_ORDER } from '../../data/personnel/lineVisualType'

/* Rediseño WC LINEA 0-10 (2026-08-28, a peticion explicita del usuario)
   -- SOLO lo usa LineDetailDrawer.jsx. Dos leyendas separadas a
   proposito (Seccion 2 del pedido: "no confundir estado de estación con
   tipo de personal"): TIPO DE PERSONAL (icono+color por rol real) y
   ESTADO DE ESTACIÓN (icono+color por ocupacion). Nunca comparte
   iconos/colores con HierarchyLegend.jsx (ese es el sistema de
   Paletizado/Accesorios/Insumos/Midea/Conveyor, identidad visual
   distinta a proposito). */
export const LINE_TYPE_ICONS = {
  liderazgo: Award,
  calidad: Shield,
  produccion: Settings,
  tecnico: Wrench,
  suministro: Package,
  apoyo: User,
}

// Fase 6c (Centro de Trabajo, WC LINEA): reemplaza el `sx` de MUI --
// `className`/`style` cumplen el mismo rol de escape hatch para el
// llamador (mismo orden de merge: color de `type` primero, luego el
// override del caller al final).
export function LineTypeIcon({ type, size = 14, className, style }) {
  const Icon = (type && LINE_TYPE_ICONS[type.iconKey]) || Shield
  return (
    <Icon
      size={size}
      className={cn(!type?.color && 'text-muted-foreground/60', className)}
      style={type?.color ? { color: type.color, ...style } : style}
    />
  )
}

const STATION_STATES = [
  { id: 'occupied', labelKey: 'lineVisualLegend.stationOccupied', color: '#10B981' },
  { id: 'available', labelKey: 'lineVisualLegend.stationAvailable', color: '#F59E0B' },
  { id: 'criticalVacancy', labelKey: 'lineVisualLegend.stationCriticalVacancy', color: '#EF4444' },
  { id: 'unassigned', labelKey: 'lineVisualLegend.stationUnassigned', color: '#94A3B8' },
]

export default function LineVisualLegend() {
  const { t } = useTranslation('centroTrabajo')
  return (
    <div className="flex flex-wrap items-center gap-4 md:gap-8">
      <div className="flex flex-wrap items-center gap-[10px]">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
          {t('lineVisualLegend.hierarchyTitle')}
        </p>
        {LINE_VISUAL_TYPE_ORDER.map((type) => (
          <div key={type.key} className="flex items-center gap-1">
            <LineTypeIcon type={type} />
            <p className="text-[11px] font-bold text-muted-foreground">{type.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
          {t('lineVisualLegend.stationStateTitle')}
        </p>
        {STATION_STATES.map((s) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <p className="text-[11px] font-bold text-muted-foreground">{t(s.labelKey)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
