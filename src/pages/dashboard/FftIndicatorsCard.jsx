import { ClipboardCheck, Cog, Gauge, Hourglass } from 'lucide-react'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
} from '@/lib/pageStyles'
import { FFT_INDICATORS } from '../../data/production/catalog'

const ICONS = {
  EFICIENCIA: Gauge,
  DEMORAS: Hourglass,
  PRODUCCION: Cog,
  CUMPLIMIENTO_PROGRAMAS: ClipboardCheck,
}

/* "Indicadores FFT" (2026-08-26, a peticion explicita del usuario) --
   orden oficial 1-4 desde FFT_INDICATORS (catalog.js, UNICA fuente,
   nunca reordenar). Hoy NINGUNO tiene fuente real de datos (verificado
   antes de implementar, ver FFT_INDICATORS/hasSource) -- se muestra
   "Sin fuente de datos configurada" para los 4, NUNCA un porcentaje
   inventado. El componente ya esta preparado para conectarse: el dia
   que un indicador tenga fuente real, basta con `hasSource:true` +
   un `value` real en catalog.js, sin tocar este archivo. */
function IndicatorRow({ indicator }) {
  const Icon = ICONS[indicator.id] || Gauge
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold">
          {indicator.order}. {indicator.label}
        </p>
        {indicator.hasSource ? (
          <p className="text-[15px] font-extrabold">{indicator.value}</p>
        ) : (
          <p className="text-[11.5px] italic text-muted-foreground">
            Sin fuente de datos configurada
          </p>
        )}
      </div>
    </div>
  )
}

export default function FftIndicatorsCard() {
  return (
    <div className={`${cardClass} h-full`}>
      <div className={cardHeaderClass}>
        <div className="min-w-0">
          <p className={cardHeaderTitleClass}>Indicadores FFT</p>
          <p className={cardHeaderSubtitleClass}>
            Eficiencia, demoras, producción y cumplimiento de programas del área
          </p>
        </div>
      </div>
      <div className="p-4 pt-1">
        <div className="divide-y divide-border">
          {FFT_INDICATORS.map((i) => (
            <IndicatorRow key={i.id} indicator={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
