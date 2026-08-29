import { ArrowLeftRight, UserMinus, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ChartCard from './ChartCard'

const ACTIVITY_ICON = {
  CHECK_IN: { Icon: UserPlus, color: '#10B981' },
  MOVE: { Icon: ArrowLeftRight, color: '#3B82F6' },
  RELEASE: { Icon: UserMinus, color: '#EF4444' },
}

/* "Actividades recientes" (2026-08-26) -- misma fuente que "Movimientos
   del día" (getRecentActivity, dashboardMetrics.js -- getMovementsForDate
   real, ya sincronizada, sin request nuevo). `time` es "HH:mm" real del
   dia de hoy (nunca un timestamp completo ni un "hace X min" fabricado,
   ver dashboardMetrics.js). "Ver todas" reutiliza los mismos datos ya
   obtenidos (hasta 30, ver getRecentActivity), sin una segunda consulta. */
function ActivityRow({ a }) {
  const meta = ACTIVITY_ICON[a.type] || { Icon: ArrowLeftRight, color: '#64748B' }
  const { Icon } = meta
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="mt-[0.8px] grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full"
        style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-bold leading-[1.3]">
          {a.employeeName} — {a.label}
        </p>
        <p className="truncate text-[10.5px] text-muted-foreground">
          {a.type === 'MOVE' && a.fromAreaName && a.toAreaName
            ? `${a.fromAreaName} → ${a.toAreaName}`
            : a.toAreaName || a.fromAreaName || ''}{' '}
          · {a.time}
        </p>
      </div>
    </div>
  )
}

export default function RecentActivityCard({ recentActivity, loading }) {
  const [open, setOpen] = useState(false)
  const items = recentActivity || []

  return (
    <>
      <ChartCard
        title="Actividades recientes"
        subtitle="Eventos reales de personal de hoy"
        loading={loading}
        empty={items.length === 0}
        emptyMessage="Todavía no hay actividad registrada hoy."
      >
        <div className="space-y-2.5">
          {items.slice(0, 6).map((a) => (
            <ActivityRow key={a.id} a={a} />
          ))}
        </div>
        {items.length > 6 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-3 cursor-pointer self-start border-0 bg-transparent p-0 text-[11.5px] font-bold text-[#3B82F6]"
          >
            Ver todas las actividades
          </button>
        )}
      </ChartCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actividades de hoy</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              {items.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
