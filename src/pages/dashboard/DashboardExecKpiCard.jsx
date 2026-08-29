/* KPI ejecutivo del Dashboard rediseñado (2026-08-25, contrato visual
   exacto del mockup aprobado por el usuario) -- COMPONENTE NUEVO, no
   reemplaza DashboardKpiCard.jsx (ese sigue en uso real por
   PersonalDeHoyTab.jsx en Centro de Trabajo, fuera de alcance de este
   rediseño exclusivo del Dashboard, ver Parte 61 del prompt).

   Sin sparkline/comparación "vs ayer": el prompt lo pide SOLO si existe
   un dato histórico real comparable, y no existe (el total de personal
   de hoy sale en su mayoría del snapshot estático sin fecha, no de un
   registro diario con el que comparar "ayer" de forma honesta) -- se
   omite por completo en vez de inventar una tendencia.

   Fase 6c: portado de MUI (Paper/Stack sx) a Tailwind. El accent llega
   como hex en runtime (prop, no clase estática), asi que las variantes
   de opacidad que MUI resolvia con alpha() se calculan aqui con
   hexToRgba() y se aplican via style inline -- la unica excepcion es el
   fondo claro/oscuro (0.025 vs 0.05), que Tailwind SI puede resolver en
   build-time via el truco de var(--css-var) fijado en runtime por
   style, para que dark: siga funcionando con la clase .dark del html. */
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function DashboardExecKpiCard({
  icon,
  accent,
  title,
  value,
  unit,
  footerLabel,
  footerValue,
  progressPct,
}) {
  return (
    <div
      className="flex h-full min-h-[128px] flex-col gap-2 rounded-2xl border bg-[var(--kpi-bg-light)] p-4 dark:bg-[var(--kpi-bg-dark)]"
      style={{
        borderColor: hexToRgba(accent, 0.16),
        '--kpi-bg-light': hexToRgba(accent, 0.025),
        '--kpi-bg-dark': hexToRgba(accent, 0.05),
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full [&>svg]:h-[19px] [&>svg]:w-[19px]"
          style={{ backgroundColor: hexToRgba(accent, 0.14), color: accent }}
        >
          {icon}
        </div>
        <p className="text-[13.5px] font-bold text-muted-foreground">{title}</p>
      </div>

      <div className="flex items-baseline gap-1.5">
        <p
          className="text-[32px] font-extrabold leading-none tracking-[-0.5px]"
          style={{ color: accent }}
        >
          {value}
        </p>
        {unit && <p className="text-[12.5px] font-semibold text-muted-foreground">{unit}</p>}
      </div>

      <div className="mt-auto">
        {progressPct != null && (
          <div
            className="mb-1 h-1.5 overflow-hidden rounded-full"
            style={{ backgroundColor: hexToRgba(accent, 0.14) }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${progressPct}%`, backgroundColor: accent }}
            />
          </div>
        )}
        <p className="text-[11.5px] font-semibold text-muted-foreground">
          {footerLabel}
          {footerValue != null ? `: ${footerValue}` : ''}
        </p>
      </div>
    </div>
  )
}
