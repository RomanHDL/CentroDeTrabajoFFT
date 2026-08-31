import { ChevronLeft, ChevronRight, FileText, Map as MapIcon, Tv } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
} from '@/lib/pageStyles'
import { cn, hexToRgba } from '@/lib/utils'

/* ─────────────────────────────────────────────
   Reemplazo de "Distribución de estaciones" en LineDetailDrawer.jsx
   (2026-08-31, a peticion explicita del usuario, foto de pizarron
   físico). Antes esa seccion era una cuadricula de estaciones con
   drag&drop para asignar personal puesto por puesto -- el usuario
   confirmo explicitamente que esa asignacion por puesto especifico ya
   NO hace falta aqui (se sigue asignando a la linea en general desde
   el layout), y que este diagrama de flujo es el MISMO para las 11
   lineas (WC LINEA 0 a la 10) -- no depende de personal/ocupacion,
   es una referencia estatica del proceso.

   Las etiquetas (N, P.E, LIM, ACE, ET, EM, LIM CAJ, CAL) son las del
   pizarron, tal cual, sin expandir su significado (a peticion
   explicita del usuario -- no inventar).

   2026-08-31, segunda ronda (a peticion explicita del usuario -- el
   primer diseño, circulos azules planos con flechas, se rechazo
   visualmente: "esa basura", "que la linea de trabajo haya teles"):
   se redibuja como una banda de ensamblaje ilustrada (icono Tv de
   lucide-react por estacion, sobre un track tipo "banda industrial"
   con patron de rayas), mucho mas grande que el diseño anterior. Sin
   imagen de referencia del usuario -- se uso criterio propio, pero
   reutilizando la MISMA paleta de 6 colores ya usada en
   lineVisualType.js (nunca una paleta inventada de cero), ciclada
   entre las 8 estaciones. Sigue siendo la misma referencia ESTATICA
   de proceso (no depende de personal/ocupacion) y el mismo click-to-
   open de ProcessSheetModal (sin cambios de comportamiento). */
const STATION_COLORS = ['#0D9488', '#DB2777', '#2563EB', '#F59E0B', '#7C3AED', '#64748B']

const PROCESS_FLOW_NODES = [
  { order: 1, label: 'N' },
  { order: 2, label: 'P.E' },
  { order: 3, label: 'LIM' },
  { order: 4, label: 'ACE' },
  { order: 5, label: 'ET' },
  { order: 6, label: 'EM' },
  { order: 7, label: 'LIM CAJ' },
  { order: 8, label: 'CAL' },
].map((node, idx) => ({ ...node, color: STATION_COLORS[idx % STATION_COLORS.length] }))

function ProcessSheetModal({ node, onClose }) {
  const { t } = useTranslation('centroTrabajo')
  const [step, setStep] = useState(0)

  // Reinicia al paso 1 cada vez que se abre con un nodo distinto.
  useEffect(() => {
    if (node) setStep(0)
  }, [node])

  if (!node) return null

  const isFirstStep = step === 0

  return (
    <Dialog open={Boolean(node)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isFirstStep
              ? t('lineDetailDrawer.processFlowStep1Title')
              : t('lineDetailDrawer.processFlowStep2Title')}
            {' — '}
            {node.label} ({node.order})
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
            {t('lineDetailDrawer.processFlowStepIndicator', { current: step + 1, total: 2 })}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-border bg-black/[.02] px-6 py-10 text-center dark:bg-white/[.03]">
            {isFirstStep ? (
              <FileText className="h-10 w-10 text-muted-foreground/50" />
            ) : (
              <MapIcon className="h-10 w-10 text-muted-foreground/50" />
            )}
            <p className="text-[13.5px] font-bold text-muted-foreground">
              {isFirstStep
                ? t('lineDetailDrawer.processFlowStep1Placeholder')
                : t('lineDetailDrawer.processFlowStep2Placeholder')}
            </p>
          </div>
        </div>
        <div className="flex justify-between gap-2 px-6 pb-5">
          {isFirstStep ? (
            <div />
          ) : (
            <Button variant="ghost" onClick={() => setStep(0)} className="font-bold">
              <ChevronLeft className="h-4 w-4" />
              {t('lineDetailDrawer.processFlowPreviousButton')}
            </Button>
          )}
          {isFirstStep ? (
            <Button onClick={() => setStep(1)} className="font-bold">
              {t('lineDetailDrawer.processFlowNextButton')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={onClose} className="font-bold">
              {t('lineDetailDrawer.processFlowCloseButton')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function LineProcessFlow() {
  const { t } = useTranslation('centroTrabajo')
  const [activeNode, setActiveNode] = useState(null)
  const columns = PROCESS_FLOW_NODES.length

  return (
    <div className={cn(cardClass, 'mb-4')}>
      <div className={cardHeaderClass}>
        <div className="min-w-0 flex-1">
          <p className={cardHeaderTitleClass}>{t('lineDetailDrawer.stationDistributionTitle')}</p>
          <p className={cardHeaderSubtitleClass}>
            {t('lineDetailDrawer.stationDistributionSubtitle')}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto p-5 md:p-7">
        <div
          className="grid gap-x-2 gap-y-3"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(92px, 1fr))`,
            gridTemplateRows: 'auto auto',
          }}
        >
          {/* "Banda transportadora": track de fondo con patron de rayas
              diagonales tipo banda industrial, centrado en la fila de
              iconos (fila 1) -- las estaciones "descansan" visualmente
              encima. Un solo elemento continuo, sin depender de flechas
              individuales entre nodos. */}
          <div
            aria-hidden="true"
            className="pointer-events-none h-3.5 self-center rounded-full shadow-inner"
            style={{
              gridColumn: `1 / span ${columns}`,
              gridRow: 1,
              backgroundColor: 'rgba(100,116,139,0.16)',
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgba(0,0,0,0.14) 0, rgba(0,0,0,0.14) 5px, transparent 5px, transparent 12px)',
            }}
          />
          {PROCESS_FLOW_NODES.map((node, idx) => (
            <button
              key={node.order}
              type="button"
              onClick={() => setActiveNode(node)}
              className="group relative z-10 flex flex-col items-center gap-1 rounded-2xl py-1 transition-transform hover:-translate-y-0.5"
              style={{ gridColumn: idx + 1, gridRow: 1 }}
            >
              <span
                className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-[3px] shadow-md transition-shadow group-hover:shadow-lg"
                style={{
                  borderColor: node.color,
                  backgroundColor: hexToRgba(node.color, 0.14),
                }}
              >
                <Tv className="h-8 w-8" style={{ color: node.color }} strokeWidth={1.75} />
              </span>
              <span
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border-2 border-background text-[11px] font-extrabold text-white shadow-sm"
                style={{ backgroundColor: node.color }}
              >
                {node.order}
              </span>
            </button>
          ))}
          {PROCESS_FLOW_NODES.map((node) => (
            <p
              key={`${node.order}-label`}
              className="text-center text-[11px] font-bold uppercase tracking-[0.3px] text-muted-foreground"
              style={{ gridColumn: node.order, gridRow: 2 }}
            >
              {node.label}
            </p>
          ))}
        </div>
      </div>
      <ProcessSheetModal node={activeNode} onClose={() => setActiveNode(null)} />
    </div>
  )
}
