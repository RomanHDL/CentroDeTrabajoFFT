import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { manualPanelClass } from '@/lib/pageStyles'
import { RELEASES } from './changelogData'

// Changelog (MI Stack Reference, HARD RULE) -- ruta real, espejo dentro de
// la app de CHANGELOG.md (fuente de verdad en la raíz del repo). Ver
// changelogData.js para el contenido -- este componente solo renderiza.
export default function ChangelogPage() {
  const { t } = useTranslation('docs')

  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">{t('changelogPage.title')}</h1>
      <p className="mb-6 text-base text-muted-foreground">{t('changelogPage.intro')}</p>

      {RELEASES.map((release) => (
        <div key={release.version} className={`${manualPanelClass} mb-4`}>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {release.version}
            </Badge>
            {release.titleKey && (
              <p className="font-bold text-foreground">{t(`changelogData.${release.titleKey}`)}</p>
            )}
          </div>
          {release.descriptionKey && (
            <p className="mb-3 text-sm text-muted-foreground">
              {t(`changelogData.${release.descriptionKey}`)}
            </p>
          )}
          {release.sections.map((section) => (
            <div key={section.labelKey} className="mb-3 last:mb-0">
              <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.4px] text-foreground">
                {t(`changelogPage.${section.labelKey}`)}
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {section.itemKeys.map((itemKey) => (
                  <li key={itemKey}>{t(`changelogData.${itemKey}`)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
