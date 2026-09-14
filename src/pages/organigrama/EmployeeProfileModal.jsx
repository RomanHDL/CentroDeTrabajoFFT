import { Camera, ChevronRight, Trash2, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { showToast } from '../../ui/toast'
import ChangePhotoDialog from './ChangePhotoDialog'
import OrgChartAvatar from './OrgChartAvatar'
import { getOrgChartManagerId, getOrgChartPath, getOrgChartPersonById } from './orgChartData'
import { deleteOrgChartPhoto, getEffectivePhotoSrc, uploadOrgChartPhoto } from './orgChartPhotos'

const FALLBACK = '—'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-b-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value || FALLBACK}</span>
    </div>
  )
}

// Fila "Jefe directo" clickeable (2026-09-14, seccion 10-14 del pedido explicito del usuario):
// navega usando el id REAL del jefe (getOrgChartManagerId, derivado de la jerarquia del arbol),
// nunca comparando el texto `manager`. <button> nativo -- da foco/teclado Enter-Space gratis, sin
// logica extra.
function ManagerRow({ manager, photoVersions, onNavigate, label }) {
  if (!manager) {
    return <InfoRow label={label} value={null} />
  }
  const photoSrc = getEffectivePhotoSrc(manager.id, manager.photo, photoVersions)
  return (
    <button
      type="button"
      onClick={() => onNavigate(manager.id)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border-b border-border/60 py-2.5 text-left transition-colors last:border-b-0 hover:bg-blue-500/5"
    >
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
        <OrgChartAvatar person={manager} photoSrc={photoSrc} size={40} />
        <span className="min-w-0 text-right">
          <span className="block truncate text-sm font-bold">{manager.name}</span>
          {manager.title && (
            <span className="block truncate text-xs text-muted-foreground">{manager.title}</span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </span>
    </button>
  )
}

export default function EmployeeProfileModal({
  personId,
  photoVersions,
  canEdit,
  onClose,
  onNavigate,
  onPhotoChanged,
  onPhotoRemoved,
}) {
  const { t } = useTranslation('organigrama')
  const [changePhotoOpen, setChangePhotoOpen] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const person = personId ? getOrgChartPersonById(personId) : null
  const open = Boolean(person)
  if (!person) return null

  const managerId = getOrgChartManagerId(person.id)
  const manager = managerId ? getOrgChartPersonById(managerId) : null
  const path = getOrgChartPath(person.id)
  const photoSrc = getEffectivePhotoSrc(person.id, person.photo, photoVersions)
  const hasPhoto = Boolean(photoSrc)

  const handleConfirmPhoto = async ({ mimeType, dataBase64 }) => {
    const result = await uploadOrgChartPhoto(person.id, mimeType, dataBase64)
    onPhotoChanged(person.id, result.updatedAt)
    setChangePhotoOpen(false)
    showToast(t('photoUpdatedToast'))
  }

  const handleRemovePhoto = async () => {
    setRemoving(true)
    try {
      await deleteOrgChartPhoto(person.id)
      onPhotoRemoved(person.id)
      showToast(t('photoRemovedToast'))
      setRemoveConfirmOpen(false)
    } catch {
      showToast(t('photoErrorRemove'), 'error')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{person.name}</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t('close')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-6 px-6 pb-6 sm:grid-cols-[200px_1fr]">
            {/* Columna izquierda -- foto + acciones (2026-09-14, seccion 3-4 del pedido) */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative">
                <OrgChartAvatar person={person} photoSrc={photoSrc} size={190} />
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setChangePhotoOpen(true)}
                    aria-label={t('changePhoto')}
                    className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full border-2 border-card bg-blue-600 text-white shadow-md transition-colors hover:bg-blue-700"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <p className="text-base font-extrabold leading-tight">{person.name}</p>
                {person.title && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{person.title}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex w-full flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setChangePhotoOpen(true)}
                  >
                    <Camera className="h-4 w-4" />
                    {t('changePhoto')}
                  </Button>
                  {hasPhoto && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => setRemoveConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('removePhoto')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Columna derecha -- informacion (2026-09-14, seccion 3 del pedido) */}
            <div>
              <p className="mb-1 text-sm font-bold">{t('employeeInfoTitle')}</p>
              <InfoRow label={t('infoPosition')} value={person.title} />
              <InfoRow label={t('infoArea')} value={person.area} />
              <InfoRow label={t('infoDepartment')} value={person.department} />
              <ManagerRow
                manager={manager}
                photoVersions={photoVersions}
                onNavigate={(id) => {
                  onClose()
                  onNavigate(id)
                }}
                label={t('infoManager')}
              />
              <InfoRow label={t('infoHireDate')} value={person.hireDate} />
              <InfoRow label={t('infoPhone')} value={person.phone} />
              <InfoRow label={t('infoEmail')} value={person.email} />
            </div>
          </div>

          {/* Ubicacion en el organigrama (2026-09-14, seccion 15 del pedido) -- breadcrumb REAL,
              construido desde getOrgChartPath (jerarquia real), cada nivel navega igual que
              "Jefe directo". No hay seccion de "Acciones/Editar informacion" a proposito: estas
              personas no son filas de Employee, no existe un editor real que reutilizar (el
              pedido explicito prohibe crear uno paralelo). */}
          <div className="border-t border-border px-6 py-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('locationInOrgChart')}
            </p>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              {path.map((node, i) => (
                <span key={node.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  {node.id === person.id ? (
                    <span className="font-bold">{node.name}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onNavigate(node.id)
                      }}
                      className="text-muted-foreground underline-offset-2 hover:text-blue-600 hover:underline dark:hover:text-blue-400"
                    >
                      {node.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChangePhotoDialog
        open={changePhotoOpen}
        onClose={() => setChangePhotoOpen(false)}
        onConfirm={handleConfirmPhoto}
        personName={person.name}
      />

      <Dialog
        open={removeConfirmOpen}
        onOpenChange={(next) => !next && setRemoveConfirmOpen(false)}
      >
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t('removePhotoConfirmTitle', { name: person.name })}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 text-sm text-muted-foreground">
            {t('removePhotoConfirmBody')}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveConfirmOpen(false)}
              disabled={removing}
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemovePhoto}
              disabled={removing}
              className={cn(removing && 'opacity-70')}
            >
              {removing ? t('saving') : t('delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
