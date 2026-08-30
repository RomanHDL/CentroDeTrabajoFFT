import { PERSONNEL_RANK_ORDER } from '../../data/personnel/rankSystem'

/* Leyenda compacta de la jerarquia de rango (2026-08-27, a peticion
   explicita del usuario) -- solo se usa en areas LINE_LIKE (Familia C),
   ver LineDetailDrawer.jsx. Una sola linea, se envuelve sola en pantallas
   angostas -- nunca ocupa una seccion propia grande.

   Fase 6c: convertido de MUI (Box/Stack/Typography + sx + useTheme) a
   Tailwind. El useTheme/`d` original solo alimentaba un ternario sin efecto
   real (`d ? 'text.secondary' : 'text.secondary'`) -- se quita, el color
   siempre fue text.secondary sin distincion de modo. rank.color es
   dinamico por dato, se aplica directo via style inline (sin alpha, igual
   que el original: `bgcolor: rank.color`). */
export default function RankLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 pb-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
        Jerarquía:
      </p>
      {PERSONNEL_RANK_ORDER.map((rank) => (
        <div key={rank.key} className="flex items-center gap-1">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: rank.color }} />
          <p className="text-[10.5px] font-semibold text-muted-foreground">{rank.label}</p>
        </div>
      ))}
    </div>
  )
}
