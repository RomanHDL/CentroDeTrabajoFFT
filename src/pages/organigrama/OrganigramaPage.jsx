import { useTranslation } from 'react-i18next'
import { cardClass, pageClass, pageSubtitleClass, pageTitleClass } from '@/lib/pageStyles'

// Modulo Organigrama (2026-09-09, a peticion explicita del usuario): reemplaza el
// "En desarrollo" (ComingSoonPage) que tenia esta ruta desde que se creo -- ver
// changelogData.js "addedOrganigrama". Muestra SOLO la primera hoja de
// "Estructura organizacional.docx" (el organigrama real, ya con fotos/nombres reales),
// exportada a imagen -- el resto del documento (si tuviera mas hojas) no se incluye,
// a peticion explicita del usuario ("solo la primera hoja"). Actualizar este modulo en
// el futuro es: reemplazar public/organigrama/estructura-organizacional.png por la
// version nueva, sin tocar este componente.
export default function OrganigramaPage() {
  const { t } = useTranslation('organigrama')
  return (
    <div className={pageClass}>
      <div className="mb-5">
        <p className={pageTitleClass}>{t('pageTitle')}</p>
        <p className={pageSubtitleClass}>{t('pageSubtitle')}</p>
      </div>
      <div className={`${cardClass} mx-auto max-w-[900px] p-4`}>
        <img
          src="/organigrama/estructura-organizacional.png"
          alt={t('imageAlt')}
          className="w-full rounded-lg"
        />
      </div>
    </div>
  )
}
