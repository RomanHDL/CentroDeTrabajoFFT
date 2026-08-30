import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { manualPanelClass } from '@/lib/pageStyles'
import { FAQ, MODULES } from './userManualData'

// User Manual (MI Stack Reference, sección 17a, HARD RULE) -- ruta real,
// contenido genuino del estado actual de cada módulo. Ver userManualData.js.
// Textos en public/locales/*/docs.json (namespace "docs") -- nombres de
// módulo se reusan de navigation.json vía mod.nameKey (mismo texto exacto).
export default function UserManualPage() {
  const { t } = useTranslation('docs')

  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">{t('userManualPage.title')}</h1>
      <p className="mb-6 text-base text-muted-foreground">
        {t('userManualPage.introText')}{' '}
        <Link to="/developer-manual" className="text-primary underline">
          {t('userManualPage.developerManualLink')}
        </Link>
        .
      </p>

      {MODULES.map((mod) => (
        <div key={mod.nameKey} className={`${manualPanelClass} mb-4`}>
          <div className="mb-2 flex items-center gap-2">
            <p className="font-bold text-foreground">{t(mod.nameKey, { ns: 'navigation' })}</p>
            <Badge variant={mod.status === 'disponible' ? 'success' : 'outline'}>
              {t(`userManualData.${mod.statusLabelKey}`)}
            </Badge>
          </div>
          <p className="whitespace-pre-line text-sm text-foreground">
            {t(`userManualData.${mod.bodyKey}`)}
          </p>
        </div>
      ))}

      <h2 className="mb-3 mt-6 text-xl font-bold text-foreground">
        {t('userManualPage.faqHeading')}
      </h2>
      {FAQ.map((entry) => (
        <div key={entry.questionKey} className={`${manualPanelClass} mb-4`}>
          <p className="mb-1 text-sm font-bold text-foreground">
            {t(`userManualData.${entry.questionKey}`)}
          </p>
          <p className="text-sm text-muted-foreground">{t(`userManualData.${entry.answerKey}`)}</p>
        </div>
      ))}
    </div>
  )
}
