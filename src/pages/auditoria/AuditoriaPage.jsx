import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Recycle,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cardClass, pageClass, pageSubtitleClass, pageTitleClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────
   Modulo Auditoria (2026-09-01, a peticion explicita del usuario) --
   antes era una pagina "Proximamente" (ComingSoonPage). Primera version:
   solo la interfaz/flujo visual, SIN persistir nada en base de datos
   todavia (confirmado explicitamente por el usuario via pregunta directa
   -- "interfaz primero, sin guardar datos", se agrega guardado real
   despues). 3 tarjetas de entrada, cada una con su dia programado real
   (martes=5S, miercoles=Auditoria, jueves=Seguridad, a peticion
   explicita). Solo "5S Proceso" tiene flujo detallado (el usuario
   describio S1..S5 explicitamente); "Auditoria" y "Seguridad" abren un
   dialogo "Proximamente" -- nunca se inventa contenido no descrito. */

const MODULES = [
  { key: 'AUDITORIA', Icon: ClipboardCheck, color: '#2563EB' },
  { key: 'PROCESO_5S', Icon: Recycle, color: '#10B981' },
  { key: 'SEGURIDAD', Icon: ShieldCheck, color: '#EF4444' },
]

const MODULE_I18N = {
  AUDITORIA: {
    titleKey: 'auditoriaCardTitle',
    descKey: 'auditoriaCardDescription',
    dayKey: 'auditoriaCardDay',
  },
  PROCESO_5S: {
    titleKey: 'process5sCardTitle',
    descKey: 'process5sCardDescription',
    dayKey: 'process5sCardDay',
  },
  SEGURIDAD: {
    titleKey: 'seguridadCardTitle',
    descKey: 'seguridadCardDescription',
    dayKey: 'seguridadCardDay',
  },
}

// Los 5 pilares reales de la metodologia 5S (estandar, no inventado por
// este proyecto) -- S1..S5 en el orden pedido explicitamente.
const FIVE_S_STEPS = ['s1', 's2', 's3', 's4', 's5']

const CLASSIFICATIONS = [
  'classificationCompliant',
  'classificationPartial',
  'classificationNonCompliant',
]

export default function AuditoriaPage() {
  const { t } = useTranslation('auditoria')
  const [openModule, setOpenModule] = useState(null)

  return (
    <div className={pageClass}>
      <div className={cn(cardClass, 'mb-4')}>
        <div className="border-b border-border bg-black/[.015] px-5 py-3.5 dark:bg-white/[.02]">
          <p className={pageTitleClass}>{t('pageTitle')}</p>
          <p className={pageSubtitleClass}>{t('pageSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <AuditModuleCard key={m.key} module={m} onOpen={() => setOpenModule(m.key)} />
        ))}
      </div>

      {openModule === 'PROCESO_5S' && <FiveSDialog onClose={() => setOpenModule(null)} />}
      {(openModule === 'AUDITORIA' || openModule === 'SEGURIDAD') && (
        <ComingSoonDialog
          title={t(MODULE_I18N[openModule].titleKey)}
          onClose={() => setOpenModule(null)}
        />
      )}
    </div>
  )
}

function AuditModuleCard({ module, onOpen }) {
  const { t } = useTranslation('auditoria')
  const { Icon, color } = module
  const { titleKey, descKey, dayKey } = MODULE_I18N[module.key]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        cardClass,
        'flex cursor-pointer select-none flex-col gap-3 p-5 text-left transition-transform duration-150 hover:-translate-y-0.5',
      )}
    >
      <div
        className="grid h-11 w-11 place-items-center rounded-2xl"
        style={{ backgroundColor: `${color}1F` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-[16px] font-extrabold">{t(titleKey)}</p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t(descKey)}</p>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11.5px] font-bold text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {t('scheduledDayLabel')}: {t(dayKey)}
      </div>
    </button>
  )
}

function ComingSoonDialog({ title, onClose }) {
  const { t } = useTranslation('auditoria')
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2 px-6 pb-6 text-center">
          <p className="text-[13.5px] font-bold text-muted-foreground">{t('comingSoonTitle')}</p>
          <p className="text-[12.5px] text-muted-foreground">{t('comingSoonDescription')}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* Flujo "5S Proceso" -- puramente cliente, sin persistencia (a peticion
   explicita del usuario, primera version). step=null muestra la intro con
   "Comenzar auditoria"; step=0..4 recorre S1..S5 en orden fijo con
   Anterior/Siguiente, cada paso con un selector de clasificacion (solo
   estado local, se resetea al cerrar). step='done' muestra el cierre. */
function FiveSDialog({ onClose }) {
  const { t } = useTranslation('auditoria')
  const [step, setStep] = useState(null)
  const [classifications, setClassifications] = useState({})

  const isIntro = step === null
  const isDone = step === 'done'
  const stepIndex = typeof step === 'number' ? step : 0
  const stepKey = FIVE_S_STEPS[stepIndex]

  function handleNext() {
    if (stepIndex >= FIVE_S_STEPS.length - 1) {
      setStep('done')
      return
    }
    setStep(stepIndex + 1)
  }

  function handleClose() {
    setStep(null)
    setClassifications({})
    onClose()
  }

  return (
    <Dialog open onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{t('start5sIntroTitle')}</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </DialogClose>
        </DialogHeader>

        {isIntro && (
          <div className="flex flex-col items-center gap-4 px-6 pb-6 text-center">
            <Recycle className="h-10 w-10 text-[#10B981]" />
            <p className="text-[13.5px] font-bold text-muted-foreground">
              {t('start5sIntroDescription')}
            </p>
            <Button onClick={() => setStep(0)} className="font-bold">
              {t('startAuditButton')}
            </Button>
          </div>
        )}

        {!isIntro && !isDone && (
          <div className="px-6 pb-2">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
              {t('stepIndicator', { current: stepIndex + 1, total: FIVE_S_STEPS.length })}
            </p>
            <div className="mb-4 rounded-[20px] border border-dashed border-border bg-black/[.02] px-6 py-6 dark:bg-white/[.03]">
              <p className="text-[15px] font-extrabold">{t(`${stepKey}Title`)}</p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {t(`${stepKey}Description`)}
              </p>
            </div>

            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
              {t('classificationLabel')}
            </p>
            <div className="mb-5 flex flex-wrap gap-2">
              {CLASSIFICATIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassifications((prev) => ({ ...prev, [stepKey]: c }))}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors duration-150',
                    classifications[stepKey] === c
                      ? 'border-blue-500 bg-blue-500/[0.12] text-blue-500'
                      : 'border-border text-muted-foreground hover:bg-accent',
                  )}
                >
                  {t(c)}
                </button>
              ))}
            </div>

            <div className="flex justify-between gap-2 pb-4">
              {stepIndex > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep(stepIndex - 1)}
                  className="font-bold"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previousButton')}
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={handleNext} className="font-bold">
                {stepIndex >= FIVE_S_STEPS.length - 1 ? t('finishButton') : t('nextButton')}
                {stepIndex < FIVE_S_STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {isDone && (
          <div className="flex flex-col items-center gap-3 px-6 pb-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#10B981]" />
            <p className="text-[15px] font-extrabold">{t('auditCompleteTitle')}</p>
            <p className="text-[12.5px] text-muted-foreground">{t('auditCompleteDescription')}</p>
            <Button onClick={handleClose} className="mt-1 font-bold">
              {t('closeButton')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
