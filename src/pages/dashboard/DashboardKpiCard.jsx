import { MoreVertical } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, hexToRgba } from '@/lib/utils'

/* ─────────────────────────────────────────────
   Card compacta y horizontal para las 3 KPI del Dashboard (Personal,
   Personal faltante, Líneas operando) -- rediseño 2026-08-24 a
   petición explícita del usuario: las cards anteriores (Paper propio
   para "Personal" + KpiCard de src/ui para las otras dos) eran
   verticales y demasiado altas. Este componente es EXCLUSIVO de estas
   3 cards del Dashboard -- KpiCard (src/ui/KpiCard.jsx) sigue
   exactamente igual y se sigue usando tal cual en PersonalDeHoyTab.jsx
   y UsuariosPage.jsx, no se tocó para no afectarlas.

   El "⋮" es puramente decorativo (el usuario lo pidió igual que en su
   mockup de referencia, aclarando explícitamente no agregar lógica si
   no existe funcionalidad real detrás) -- no tiene onClick.

   secondaryLabel/secondaryValue/secondaryNote: bloque extra opcional
   despues de un divisor vertical (solo la card "Personal" lo usa, para
   "Ideal 137 / Meta por área"). tooltipNote: texto largo que antes
   vivía permanente en la card ("Meta de personal por área — no es el
   total de empleados del sistema.") -- ahora vive en un Tooltip sobre
   secondaryNote, nunca ocupa espacio fijo.

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind -- sigue
   siendo consumido por PersonalDeHoyTab.jsx, ya no solo por Dashboard
   (ese ya usa DashboardExecKpiCard.jsx en su lugar).

   onClick/active/children (2026-09-02, a peticion explicita del usuario: unificar el
   lenguaje visual de "Sin asignar"/"Bajas" con el de "Personal" reutilizando ESTE MISMO
   componente en vez de duplicar sus estilos) -- 100% ADITIVO, Personal nunca pasa estos
   props asi que su render (un <div>, sin onClick) queda pixel-identico a antes. Cuando
   onClick esta presente, la card se vuelve un <button> clickeable (KPI filtrable, mismo
   patron ya usado en AreaCard/SinAsignarKpiCard de otras pantallas) con highlight de
   `active` (borde solido + fondo mas intenso). `children`, si se pasa, reemplaza el bloque
   estandar de valor/unidad/secundario -- lo usa "Ultima baja" (Bajas) porque su contenido
   real (nombre + fecha) no encaja en el slot rigido de numero grande. El "⋮" decorativo se
   renderiza como <span> (no <button>) cuando la card entera ya es un boton, para no anidar
   un boton dentro de otro (HTML invalido) -- en el <div> de Personal sigue siendo el mismo
   <button> decorativo de siempre. */
export default function DashboardKpiCard({
  icon,
  accent,
  title,
  subtitle,
  value,
  unit,
  secondaryLabel,
  secondaryValue,
  secondaryNote,
  tooltipNote,
  onClick,
  active,
  children,
}) {
  const Comp = onClick ? 'button' : 'div'
  const content = (
    <>
      <div
        className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full border [&_svg]:h-6 [&_svg]:w-6"
        style={{
          backgroundColor: hexToRgba(accent, 0.12),
          color: accent,
          borderColor: hexToRgba(accent, 0.18),
        }}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] font-bold uppercase leading-[1.2] tracking-[0.4px]">
            {title}
          </p>
          {onClick ? (
            <span className="-mt-0.5 p-0 text-muted-foreground/50" aria-hidden="true">
              <MoreVertical className="h-4 w-4" />
            </span>
          ) : (
            <button
              type="button"
              tabIndex={-1}
              className="-mt-0.5 cursor-default p-0 text-muted-foreground/50"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mb-1 truncate text-xs font-medium leading-[1.2] text-muted-foreground">
          {subtitle}
        </p>

        {children || (
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <p
                className="text-[30px] font-extrabold leading-none tracking-[-0.5px]"
                style={{ color: accent }}
              >
                {value}
              </p>
              {unit && <p className="text-[13px] font-semibold text-muted-foreground">{unit}</p>}
            </div>

            {secondaryValue != null && (
              <>
                <div
                  className="my-0.5 w-px self-stretch"
                  style={{ backgroundColor: hexToRgba(accent, 0.2) }}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase leading-[1.2] tracking-[0.3px] text-muted-foreground">
                    {secondaryLabel}
                  </p>
                  <p className="text-base font-bold leading-[1.2] text-muted-foreground">
                    {secondaryValue}
                  </p>
                  {secondaryNote &&
                    (tooltipNote ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="cursor-help truncate text-[9px] leading-[1.2] text-muted-foreground/60">
                            {secondaryNote}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="start">
                          {tooltipNote}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <p className="truncate text-[9px] leading-[1.2] text-muted-foreground/60">
                        {secondaryNote}
                      </p>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={cn(
        'flex h-full min-h-[112px] items-center gap-3 overflow-hidden rounded-2xl border border-l-[3px] p-3.5 text-left',
        onClick && 'transition-transform duration-150 hover:-translate-y-0.5',
      )}
      style={{
        borderColor: active ? accent : hexToRgba(accent, 0.14),
        borderLeftColor: accent,
        backgroundColor: hexToRgba(accent, active ? 0.06 : 0.03),
        ...(active ? { borderWidth: 2 } : null),
      }}
    >
      {content}
    </Comp>
  )
}
