import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Recorte de fotografia (2026-09-14, a peticion explicita del usuario -- "vista previa, recorte
// cuadrado 1:1, mover, zoom, confirmar/cancelar"): react-easy-crop es la unica libreria nueva
// para esto (no hay nada equivalente ya instalado, confirmado antes de este cambio). El
// resultado se manda al servidor como JPEG base64 (compatibilidad universal de canvas -- WebP de
// canvas no es soportado en todos los navegadores todavia); el servidor (sharp, ver
// api/organigrama/[id]/photo.js) hace la optimizacion FINAL a 512x512 WebP antes de guardar --
// aqui solo se recorta y se limita a un tamaño razonable para no mandar un archivo gigante.
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB, tal cual el limite pedido explicitamente
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const OUTPUT_MAX_SIDE = 1024

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen.'))
    img.src = src
  })
}

async function cropToBase64(imageSrc, cropPixels) {
  const image = await loadImage(imageSrc)
  const side = Math.min(OUTPUT_MAX_SIDE, Math.max(cropPixels.width, cropPixels.height))
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    side,
    side,
  )
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  return dataUrl.split(',')[1]
}

export default function ChangePhotoDialog({ open, onClose, onConfirm, personName }) {
  const { t } = useTranslation('organigrama')
  const inputRef = useRef(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const reset = useCallback(() => {
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setError(null)
    setSaving(false)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handleClose = () => {
    if (saving) return
    reset()
    onClose()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('photoErrorType'))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t('photoErrorSize'))
      return
    }
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setImageSrc(dataUrl)
    } catch {
      setError(t('photoErrorRead'))
    }
  }

  const handleCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || saving) return
    setSaving(true)
    setError(null)
    try {
      const dataBase64 = await cropToBase64(imageSrc, croppedAreaPixels)
      await onConfirm({ mimeType: 'image/jpeg', dataBase64 })
      reset()
    } catch {
      setError(t('photoErrorUpload'))
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('changePhotoTitle', { name: personName })}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {!imageSrc ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileChange}
                className="hidden"
                id="orgchart-photo-input"
                aria-label={t('choosePhoto')}
              />
              <Button type="button" onClick={() => inputRef.current?.click()}>
                {t('choosePhoto')}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t('photoRequirements')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-black/80">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{t('zoomLabel')}</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                  aria-label={t('zoomLabel')}
                />
              </div>
            </div>
          )}

          {error && <p className={cn('mt-3 text-center text-sm text-destructive')}>{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
            {t('cancel')}
          </Button>
          {imageSrc && (
            <Button type="button" onClick={handleConfirm} disabled={saving || !croppedAreaPixels}>
              {saving ? t('saving') : t('confirmPhoto')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
