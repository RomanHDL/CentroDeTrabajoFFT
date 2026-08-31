import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Map as MapIcon,
  Tv,
} from 'lucide-react'
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
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'

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

   2026-08-31, cuarta ronda (a peticion explicita del usuario, con foto
   del pizarron de nuevo como referencia exacta): las 3 rondas
   anteriores fallaron en 3 cosas puntuales que el usuario aclaro
   viendo el Preview en vivo:
   1) Faltaba una "linea de trabajo" con TVs arriba -- se agrega
      LineTrack, una barra horizontal con iconos Tv repetidos, ARRIBA
      del diagrama de estaciones (no ligada 1:1 a cada estacion, es la
      linea principal de producto).
   2) El orden de las estaciones NO es una fila recta -- el pizarron
      tiene un patron de zigzag (fila superior/inferior alternada,
      ver ROW por nodo abajo, calcado de la foto real, no inventado).
   3) Debe cubrir el ancho completo -- eso se resolvio en
      LineDetailDrawer.jsx (esta seccion ahora vive FUERA del grid de
      2 columnas, como su propia fila de ancho completo).
   Se conserva el estilo de caja 2D (rounded-[20px] border-t-[3px],
   mismo patron de OperatingFloorPlan.jsx) de la ronda anterior -- el
   usuario no lo rechazo, solo pidio corregir orden/ancho/linea.

   2026-08-31, quinta ronda (a peticion explicita del usuario): cada
   nodo con posicion real conocida muestra numero+nombre del empleado
   ocupante. Mapeo confirmado EXPLICITAMENTE por el usuario (pregunta
   directa, no adivinado): P.E->'Prueba eléctrica', LIM->'Limpieza de
   TV', ACE->'Suministro de Accesorios', ET->'Etiquetado',
   EM->prefijo 'Empaque' (primera posicion que empiece asi, cubre
   tanto 'Empaque' solo como 'Empaque 1'/'Empaque 2' segun la linea),
   CAL->'Calidad'. N y LIM CAJ NO tienen posicion real equivalente en
   el catalogo -- el usuario confirmo explicitamente dejarlos sin
   empleado (solo la etiqueta), en vez de inventar una posicion que
   no existe. */
const STATION_COLORS = ['#0D9488', '#DB2777', '#2563EB', '#F59E0B', '#7C3AED', '#64748B']

// row: 1 = fila superior, 2 = fila inferior -- calcado del pizarron real
// (foto), no inventado. col: posicion horizontal (1 a 7). stationName /
// stationPrefix: como encontrar la Workstation real dentro de
// `workstations` (null = sin posicion real equivalente, ver nota arriba).
const PROCESS_FLOW_NODES = [
  { order: 1, label: 'N', row: 2, col: 1, stationName: null },
  { order: 2, label: 'P.E', row: 1, col: 2, stationName: 'Prueba eléctrica' },
  { order: 3, label: 'LIM', row: 1, col: 3, stationName: 'Limpieza de TV' },
  { order: 4, label: 'ACE', row: 2, col: 3, stationName: 'Suministro de Accesorios' },
  { order: 5, label: 'ET', row: 2, col: 4, stationName: 'Etiquetado' },
  { order: 6, label: 'EM', row: 1, col: 5, stationPrefix: 'Empaque' },
  { order: 7, label: 'LIM CAJ', row: 2, col: 6, stationName: null },
  { order: 8, label: 'CAL', row: 2, col: 7, stationName: 'Calidad' },
].map((node, idx) => ({ ...node, color: STATION_COLORS[idx % STATION_COLORS.length] }))

/* Busca la Workstation real de un nodo dentro de `workstations` (mismo
   array de LineDetailDrawer.jsx, ver getLineWorkstationsWithOccupancy) --
   por nombre exacto o por prefijo (Empaque). Devuelve null si el nodo no
   tiene posicion real (N/LIM CAJ) o si esa linea no tiene esa posicion. */
function findWorkstation(node, workstations) {
  if (!workstations?.length) return null
  if (node.stationName) return workstations.find((w) => w.name === node.stationName) || null
  if (node.stationPrefix)
    return workstations.find((w) => w.name.startsWith(node.stationPrefix)) || null
  return null
}

const TOTAL_COLS = 7

/* Icono de conector segun el cambio de fila entre un nodo y el
   siguiente (sube/baja/misma fila) -- deriva el zigzag real del
   pizarron sin hardcodear un dibujo por transicion. */
function connectorIcon(fromRow, toRow) {
  if (toRow < fromRow) return ArrowUpRight
  if (toRow > fromRow) return ArrowDownRight
  return ArrowRight
}

/* Barra "linea de trabajo": franja horizontal con iconos de TV
   repetidos, arriba del diagrama de estaciones -- representa la linea
   principal de producto (a peticion explicita del usuario, foto de
   pizarron: "que la linea de trabajo haya teles"). No esta ligada 1:1
   a las 8 estaciones de abajo, es decorativa/referencial. */
function LineTrack() {
  const tvCount = 8
  return (
    <div className="relative mb-5 flex h-11 items-center overflow-hidden rounded-full border border-border bg-muted/40">
      <div
        className="absolute inset-y-0 left-0 right-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(-45deg, rgba(100,116,139,0.12) 0, rgba(100,116,139,0.12) 6px, transparent 6px, transparent 14px)',
        }}
        aria-hidden="true"
      />
      <div className="relative flex w-full items-center justify-around px-3">
        {Array.from({ length: tvCount }, (_, i) => `tv-${i}`).map((key) => (
          <Tv key={key} className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.75} />
        ))}
      </div>
    </div>
  )
}

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

export default function LineProcessFlow({ workstations }) {
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
      <div className="overflow-x-auto p-5 md:p-7">
        <div className="min-w-[1100px]">
          <LineTrack />
          <div
            className="grid items-center gap-x-1 gap-y-6"
            style={{
              gridTemplateColumns: `repeat(${TOTAL_COLS}, 1fr)`,
              gridTemplateRows: 'auto auto',
            }}
          >
            {PROCESS_FLOW_NODES.map((node) => {
              const ws = findWorkstation(node, workstations)
              const occupant = ws?.occupants?.[0]
              return (
                <button
                  key={node.order}
                  type="button"
                  onClick={() => setActiveNode(node)}
                  className="relative z-10 flex w-[144px] shrink-0 cursor-pointer select-none flex-col items-center gap-1 justify-self-center rounded-[20px] border border-t-[3px] p-2.5 text-center transition-[box-shadow,background-color] duration-150 hover:shadow-[0_0_0_2px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_0_0_2px_rgba(255,255,255,0.08)]"
                  style={{
                    gridColumn: node.col,
                    gridRow: node.row,
                    borderColor: hexToRgba(node.color, 0.35),
                    borderTopColor: node.color,
                    backgroundColor: hexToRgba(node.color, 0.05),
                  }}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-extrabold text-white"
                    style={{ backgroundColor: node.color }}
                  >
                    {node.order}
                  </span>
                  <p className="text-[13px] font-extrabold" style={{ color: node.color }}>
                    {node.label}
                  </p>
                  {occupant ? (
                    <div className="mt-0.5 w-full border-t border-border/60 pt-1">
                      <p className="truncate text-[11px] font-bold">
                        {formatEmployeeNumber(occupant.employeeNumber)}
                      </p>
                      <p className="truncate text-[10.5px] text-muted-foreground">
                        {occupant.employee?.name || '—'}
                      </p>
                    </div>
                  ) : ws ? (
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.3px] text-muted-foreground/70">
                      {t('lineDetailDrawer.stationAvailableStatus')}
                    </p>
                  ) : null}
                </button>
              )
            })}
            {PROCESS_FLOW_NODES.slice(0, -1).map((node, idx) => {
              const next = PROCESS_FLOW_NODES[idx + 1]
              const Icon = connectorIcon(node.row, next.row)
              return (
                <div
                  key={`connector-${node.order}`}
                  className="pointer-events-none flex items-center justify-center"
                  style={{
                    gridColumn: node.col < next.col ? `${node.col} / span 2` : node.col,
                    gridRow:
                      node.row === next.row ? node.row : `${Math.min(node.row, next.row)} / span 2`,
                  }}
                >
                  {/* Flechas "mas marcadas y 3D negreadas" (a peticion
                      explicita del usuario): icono mas grande, trazo mas
                      grueso, color oscuro solido en vez del gris tenue
                      anterior, + una copia desplazada detras (mismo color,
                      opacidad baja) simulando una sombra/relieve 3D. */}
                  <div className="relative">
                    <Icon
                      className="absolute left-[1.5px] top-[1.5px] h-7 w-7 text-black/25 dark:text-black/40"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                    <Icon
                      className="relative h-7 w-7 text-slate-700 dark:text-slate-300"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <ProcessSheetModal node={activeNode} onClose={() => setActiveNode(null)} />
    </div>
  )
}
