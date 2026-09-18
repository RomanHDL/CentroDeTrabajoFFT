import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { formatInt } from './formatters'

/* "Producción por condición" y "Producción por pulgadas" (2026-09-18, a peticion explicita del
   usuario, reemplazan a "Avance mensual") -- mismo estilo comparativo semana-actual-vs-anterior que
   WeeklyComparisonChart (barra gris = semana anterior, % arriba de cada par), pero con las
   categorias (condicion/tamaño) en el eje X en vez de los dias. Unica diferencia real de diseño (a
   peticion explicita del usuario, "ponle colores diferentes a los 7"): la barra de la SEMANA ACTUAL
   usa un color DISTINTO por categoria (para comparar visualmente cual condicion/tamaño produce mas
   de un vistazo) -- la de la semana anterior se queda gris neutro en las 2 tablas, igual que en
   WeeklyComparisonChart, para no competir visualmente con esa lectura.
   Este componente es compartido (nunca se pidieron 2 implementaciones separadas, la unica
   diferencia real entre "condicion" y "pulgadas" es la fuente de datos y la etiqueta del eje X). */

const COLOR_PREVIOUS = '#CBD5E1'
// 7 colores distintos, TV-legibles, deliberadamente SIN rojo/verde (reservados para negativo/
// positivo en el resto del dashboard) ni naranja (reservado para "meta" en el diseño aprobado).
export const CATEGORY_COLORS = ['#2563EB', '#7C3AED', '#0EA5E9', '#DB2777', '#6366F1', '#0D9488', '#CA8A04']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-[10px] border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-[12.5px] font-bold">{label}</p>
      <p className="text-xs text-muted-foreground">
        {formatInt(row.previousQty)} · {formatInt(row.currentQty)}
      </p>
    </div>
  )
}

function PctLabel(data) {
  return function PctLabelContent(props) {
    const { x, y, width, index } = props
    const row = data[index]
    if (!row) return null
    const cx = x + width / 2
    if (typeof row.pctChange !== 'number') {
      return (
        <text x={cx} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="#94A3B8">
          —
        </text>
      )
    }
    const color = row.pctChange >= 0 ? '#047857' : '#B91C1C'
    return (
      <text x={cx} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>
        {row.pctChange >= 0 ? '+' : ''}
        {row.pctChange.toFixed(1)}%
      </text>
    )
  }
}

/**
 * rows: [{ <labelField>, name?, currentQty, previousQty, pctChange }] -- ya viene una fila por
 * categoria real (condicion vendible fija, o tamaño de pantalla encontrado), nunca se agrega nada
 * aqui, este componente solo dibuja.
 * getLabel(row): texto del eje X (ej. el codigo "-GRA", o "55"" para tamaño).
 * legendItems: [{ color, label }] -- para la leyenda de colores debajo del grafico (ej. "-GRA ·
 * Renewed A"); si no se da, no se dibuja leyenda (caso de "pulgadas", donde el numero ya se explica
 * solo).
 */
export default function CategoryComparisonChart({ title, subtitle, rows, getLabel, legendItems }) {
  const data = rows.map((row, i) => ({
    ...row,
    label: getLabel(row),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))
  const currentTotal = data.reduce((s, d) => s + d.currentQty, 0)
  const previousTotal = data.reduce((s, d) => s + d.previousQty, 0)

  return (
    <div className={cardClass}>
      <div className={`${cardHeaderClass} items-start justify-between`}>
        <div className="min-w-0 flex-1">
          <p className={cardHeaderTitleClass}>{title}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-semibold text-muted-foreground">
          <span>{formatInt(currentTotal)} / {formatInt(previousTotal)}</span>
        </div>
      </div>
      <div className="h-[240px] px-4 pb-2 pt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,.12)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,.06)' }} />
            <Bar dataKey="previousQty" fill={COLOR_PREVIOUS} radius={[4, 4, 0, 0]} maxBarSize={34} />
            <Bar dataKey="currentQty" radius={[4, 4, 0, 0]} maxBarSize={34}>
              {data.map((d, i) => (
                <Cell key={`${d.label}-${i}`} fill={d.color} />
              ))}
              <LabelList dataKey="pctChange" content={PctLabel(data)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {legendItems && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 text-[11.5px] font-medium text-muted-foreground">
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
