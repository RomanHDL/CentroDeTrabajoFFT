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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { alertToneClass, cardClass, pageClass, pageSubtitleClass, pageTitleClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { getLineWorkstationsWithOccupancy } from '../../data/personnel/repository'
import {
  canonicalOperationalAreaId,
  WORK_CENTERS,
  workCenterById,
} from '../../data/production/catalog'
import EmployeeAvatar from '../centro-trabajo/EmployeeAvatar'

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

// El empleado que resuelve getLineWorkstationsWithOccupancy trae el id LOCAL
// (localStorage: snapshot/EMPLOYEE_DIRECTORY o "emp-<ts>-<n>"), NUNCA el cuid
// real de Postgres -- misma distincion documentada en
// src/data/personnel/apiSync.js (serverIdByLocalId). AuditEvaluation.employeeId
// (server-lib/db/schema.js) es FK contra el Employee real de la base, asi que
// antes de guardar hay que traducir via /api/personnel/employees (mismo
// criterio de match que apiSync.js: numero de empleado real, o nombre
// completo para PROYECTO/PENDIENTE que muchas personas comparten). Sin esta
// traduccion el POST fallaria siempre con "Empleado no encontrado".
const PLACEHOLDER_EMPLOYEE_NUMBERS = new Set(['PROYECTO', 'PENDIENTE'])

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

/* Flujo "5S Proceso" (2026-09-02, a peticion explicita del usuario --
   "quiero que donde este auditando salga una pagina centro de trabajo,
   puesto de trabajo que jale a la persona que ande auditando"): step=null
   muestra la intro CON el selector de Centro de trabajo -> Puesto de
   trabajo -> persona resuelta automaticamente (misma fuente de datos que
   "Distribucion de estaciones" de Centro de Trabajo, ver
   LineDetailDrawer.jsx: canonicalOperationalAreaId + getLineWorkstationsWithOccupancy,
   nunca una fuente nueva). "Comenzar auditoria" solo se habilita con
   area+puesto+persona resueltos. step=0..4 recorre S1..S5 en orden fijo,
   igual que antes. Al terminar S5 (handleNext en el ultimo paso) ya SI se
   persiste de verdad -- POST a /api/evaluaciones con el score calculado en
   servidor -- antes era solo interfaz sin guardar nada (confirmado
   explicitamente por el usuario en esa primera version). Si el POST falla
   se queda en el mismo paso con el error visible, nunca se cierra ni se
   resetea, para no perder la clasificacion ya hecha. */
function FiveSDialog({ onClose }) {
  const { t } = useTranslation('auditoria')
  const [step, setStep] = useState(null)
  const [classifications, setClassifications] = useState({})
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [selectedStationName, setSelectedStationName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Directorio real de Postgres (id/employeeNumber/fullName), para traducir
  // el empleado LOCAL resuelto por estacion a su id real de servidor -- ver
  // comentario junto a PLACEHOLDER_EMPLOYEE_NUMBERS arriba. Se carga una sola
  // vez al abrir el dialogo (GET /api/personnel/employees, ya existente en
  // Fase 1, solo requiere sesion -- no se inventa ningun endpoint nuevo).
  const [serverEmployees, setServerEmployees] = useState(null)
  const [serverEmployeesError, setServerEmployeesError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/personnel/employees', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error((data && data.error) || t('employeeDirectoryErrorGeneric'))
        return data
      })
      .then((data) => {
        if (!cancelled) setServerEmployees(data.employees || [])
      })
      .catch((e) => {
        if (!cancelled) setServerEmployeesError(e.message || t('employeeDirectoryErrorGeneric'))
      })
    return () => {
      cancelled = true
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: se carga solo una vez al montar (dialogo abierto), `t` es estable en la practica
  }, [])

  const isIntro = step === null
  const isDone = step === 'done'
  const stepIndex = typeof step === 'number' ? step : 0
  const stepKey = FIVE_S_STEPS[stepIndex]

  const canonicalAreaId = selectedAreaId ? canonicalOperationalAreaId(selectedAreaId) : null
  const workstations = canonicalAreaId ? getLineWorkstationsWithOccupancy(canonicalAreaId) : []
  const selectedArea = selectedAreaId ? workCenterById(selectedAreaId) : null
  const selectedStation = selectedStationName
    ? workstations.find((w) => w.name === selectedStationName) || null
    : null
  const auditedEmployee = selectedStation?.occupants?.[0]?.employee || null
  const serverEmployeeRecord =
    auditedEmployee && serverEmployees
      ? serverEmployees.find((se) =>
          PLACEHOLDER_EMPLOYEE_NUMBERS.has(auditedEmployee.employeeNumber)
            ? se.fullName === auditedEmployee.name
            : se.employeeNumber === auditedEmployee.employeeNumber,
        ) || null
      : null
  const canStartAudit = Boolean(selectedArea && selectedStation && auditedEmployee && serverEmployeeRecord)

  function handleAreaChange(areaId) {
    setSelectedAreaId(areaId)
    setSelectedStationName('')
  }

  async function handleNext() {
    if (stepIndex < FIVE_S_STEPS.length - 1) {
      setStep(stepIndex + 1)
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/evaluaciones', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: serverEmployeeRecord.id,
          areaId: selectedArea.id,
          stationName: selectedStation.name,
          classifications,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error((data && data.error) || t('saveErrorGeneric'))
      setStep('done')
    } catch (e) {
      setSubmitError(e.message || t('saveErrorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setStep(null)
    setClassifications({})
    setSelectedAreaId('')
    setSelectedStationName('')
    setSubmitError('')
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
          <div className="flex flex-col gap-4 px-6 pb-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <Recycle className="h-10 w-10 text-[#10B981]" />
              <p className="text-[13.5px] font-bold text-muted-foreground">
                {t('start5sIntroDescription')}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fives-area">{t('workCenterLabel')}</Label>
              <Select value={selectedAreaId} onValueChange={handleAreaChange}>
                <SelectTrigger id="fives-area">
                  <SelectValue placeholder={t('workCenterPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {WORK_CENTERS.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {workCenterById(w.id)?.name || w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAreaId && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fives-station">{t('workstationLabel')}</Label>
                <Select value={selectedStationName} onValueChange={setSelectedStationName}>
                  <SelectTrigger id="fives-station">
                    <SelectValue placeholder={t('workstationPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {workstations.map((w) => {
                      const occupant = w.occupants?.[0]?.employee || null
                      return (
                        <SelectItem key={w.name} value={w.name}>
                          {occupant
                            ? t('workstationOptionOccupied', {
                                name: w.name,
                                employeeName: occupant.name,
                              })
                            : t('workstationOptionAvailable', { name: w.name })}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {workstations.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">{t('noWorkstationsMessage')}</p>
                )}
              </div>
            )}

            {selectedStationName &&
              (auditedEmployee ? (
                <>
                  <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-border bg-black/[.02] px-4 py-3 dark:bg-white/[.03]">
                    <EmployeeAvatar employee={auditedEmployee} size={44} />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                        {t('auditedPersonLabel')}
                      </p>
                      <p className="text-[14px] font-extrabold">{auditedEmployee.name}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {formatEmployeeNumber(auditedEmployee.employeeNumber)}
                      </p>
                    </div>
                  </div>
                  {serverEmployeesError ? (
                    <Alert className={alertToneClass('error')}>{serverEmployeesError}</Alert>
                  ) : serverEmployees === null ? (
                    <p className="text-[12px] text-muted-foreground">
                      {t('verifyingEmployeeMessage')}
                    </p>
                  ) : (
                    !serverEmployeeRecord && (
                      <Alert className={alertToneClass('warning')}>
                        {t('employeeNotSyncedMessage')}
                      </Alert>
                    )
                  )}
                </>
              ) : (
                <Alert className={alertToneClass('warning')}>{t('noOccupantMessage')}</Alert>
              ))}

            <Button onClick={() => setStep(0)} disabled={!canStartAudit} className="font-bold">
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

            {submitError && <Alert className={cn(alertToneClass('error'), 'mb-3')}>{submitError}</Alert>}

            <div className="flex justify-between gap-2 pb-4">
              {stepIndex > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep(stepIndex - 1)}
                  disabled={submitting}
                  className="font-bold"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previousButton')}
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={handleNext} disabled={submitting} className="font-bold">
                {stepIndex >= FIVE_S_STEPS.length - 1
                  ? submitting
                    ? t('savingButton')
                    : t('finishButton')
                  : t('nextButton')}
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
