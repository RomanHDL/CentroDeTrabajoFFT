import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { AREA_GROUPS, setActiveAreaGroup } from '../data/production/areaGroup'
import { useAreaGroup } from '../data/production/useAreaGroup'

/* Selector global FFT/Sorting (2026-09-08, a peticion explicita del usuario -- ver comentario
   grande en src/data/production/areaGroup.js). Vive en HeaderUserActions.jsx a proposito: ese
   componente ya se monta tanto en la barra superior global (AppLayout.jsx, Dashboard/Registro
   de personal/Asistencia) como en el header propio de Centro de Trabajo
   (CentroTrabajoPage.jsx) -- un solo lugar para que el boton aparezca en los 4 modulos que el
   usuario nombro, sin duplicar el componente. */
export default function AreaGroupToggle() {
  const { t } = useTranslation('layout')
  const active = useAreaGroup()

  return (
    <div
      title={t('headerUserActions.areaGroupTitle')}
      className="flex items-center rounded-full border border-border bg-background p-0.5 text-xs font-bold"
    >
      {AREA_GROUPS.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => setActiveAreaGroup(g.key)}
          className={cn(
            'rounded-full px-3 py-1 transition-colors duration-200',
            active === g.key
              ? 'bg-[#3B82F6] text-white'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t(`headerUserActions.${g.labelKey}`)}
        </button>
      ))}
    </div>
  )
}
