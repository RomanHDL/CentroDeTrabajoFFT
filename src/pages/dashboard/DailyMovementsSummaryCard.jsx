import { ArrowDown, ArrowLeftRight, ArrowUp, Minus } from 'lucide-react'
import ChartCard from './ChartCard'

/* "Movimientos del día" (2026-08-26) -- desglose real de
   EmployeeMovement/DailyAssignment de HOY (getDailyMovementsBreakdown,
   dashboardMetrics.js): Asignaciones=CHECK_IN, Removidos=RELEASE,
   Movimientos=MOVE, Neto=Asignaciones-Removidos. Nunca compara "vs
   ayer" -- no existe ese histórico agregado por dia hoy (ver
   MovementsDailyCard, que sí tiene su propia fuente real de 7 dias por
   separado si se necesita esa comparación). */
function Row({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <div
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {icon}
      </div>
      <p className="flex-1 text-[12.5px] text-muted-foreground">{label}</p>
      <p className="text-base font-extrabold">{value}</p>
    </div>
  )
}

export default function DailyMovementsSummaryCard({ dailyMovements, loading }) {
  const d = dailyMovements || { asignaciones: 0, removidos: 0, movimientos: 0, neto: 0, total: 0 }
  return (
    <ChartCard
      title="Movimientos del día"
      subtitle="Asignaciones, liberaciones y reasignaciones de hoy"
      loading={loading}
      empty={d.total === 0}
      emptyMessage="Todavía no hay movimientos registrados hoy."
    >
      <div className="divide-y divide-border">
        <Row
          icon={<ArrowUp className="h-4 w-4" />}
          label="Asignaciones"
          value={d.asignaciones}
          color="#10B981"
        />
        <Row
          icon={<ArrowDown className="h-4 w-4" />}
          label="Removidos / Liberados"
          value={d.removidos}
          color="#EF4444"
        />
        <Row
          icon={<ArrowLeftRight className="h-4 w-4" />}
          label="Movimientos / Reasignaciones"
          value={d.movimientos}
          color="#3B82F6"
        />
      </div>
      <div className="mt-1 flex items-center gap-2.5 border-t-2 border-border pt-2.5">
        <div
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
          style={{
            backgroundColor: d.neto >= 0 ? '#10B98122' : '#EF444422',
            color: d.neto >= 0 ? '#10B981' : '#EF4444',
          }}
        >
          <Minus className="h-4 w-4" />
        </div>
        <p className="flex-1 text-[12.5px] font-bold">Neto</p>
        <p
          className="text-[17px] font-extrabold"
          style={{ color: d.neto >= 0 ? '#10B981' : '#EF4444' }}
        >
          {d.neto > 0 ? `+${d.neto}` : d.neto}
        </p>
      </div>
    </ChartCard>
  )
}
