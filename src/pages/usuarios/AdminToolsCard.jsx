import { useTranslation } from 'react-i18next'
import ClearLayoutPanel from './ClearLayoutPanel'
import RestoreLayoutPanel from './RestoreLayoutPanel'

/* "Herramientas administrativas" -- agrupa visualmente Vaciar/Restaurar
   layout (2026-08-25, rediseño del modulo Usuarios): son acciones de
   mantenimiento del layout de planta, sin relacion con el sistema de
   permisos, asi que se separan de "Gestion de permisos" en su propia card,
   debajo. La logica de cada panel (confirmacion, suppressBaselinePlacement/
   restoreBaselinePlacement) NO se toca -- solo cambia el contenedor visual. */
export default function AdminToolsCard() {
  const { t } = useTranslation('usuarios')
  return (
    <div className="mt-6 rounded-[20px] border border-border p-5">
      <p className="mb-1 text-base font-extrabold">{t('adminToolsCard.title')}</p>
      <p className="mb-4 text-[13px] text-muted-foreground">{t('adminToolsCard.subtitle')}</p>
      <div className="flex flex-col gap-4">
        <ClearLayoutPanel />
        <RestoreLayoutPanel />
      </div>
    </div>
  )
}
