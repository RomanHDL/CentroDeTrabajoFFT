import { ArrowRight, ChevronLeft, ChevronRight, FileText, Map as MapIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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
   explicita del usuario -- no inventar). El pizarron tiene una
   pequeña desviacion vertical entre los nodos 3-4-5; se simplifica
   aqui a una fila horizontal continua con wrap responsivo, priorizando
   claridad sobre replicar la geometria exacta (decision explicita del
   usuario al pedir la implementacion).

   Contenido del modal (Hoja de Proceso / Planos por puesto) es
   ESTRUCTURA VACIA a proposito -- el usuario confirmo que arme el
   diseño primero, sin fotos/manuales/plan de accion reales todavia
   (nada inventado). */
const PROCESS_FLOW_NODES = [
  { order: 1, label: 'N' },
  { order: 2, label: 'P.E' },
  { order: 3, label: 'LIM' },
  { order: 4, label: 'ACE' },
  { order: 5, label: 'ET' },
  { order: 6, label: 'EM' },
  { order: 7, label: 'LIM CAJ' },
  { order: 8, label: 'CAL' },
]

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
      <div className="flex flex-wrap items-center gap-x-1 gap-y-4 p-4">
        {PROCESS_FLOW_NODES.map((node, idx) => (
          <div key={node.order} className="flex items-center gap-1">
            {idx > 0 && (
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground/50"
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => setActiveNode(node)}
              className="flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-accent"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-blue-500 bg-blue-500/[0.08] text-[15px] font-extrabold text-blue-600 dark:text-blue-400">
                {node.order}
              </span>
              <span className="text-[10.5px] font-bold text-muted-foreground">{node.label}</span>
            </button>
          </div>
        ))}
      </div>
      <ProcessSheetModal node={activeNode} onClose={() => setActiveNode(null)} />
    </div>
  )
}
