import { useTranslation } from 'react-i18next'
import ComingSoonPage from '../shared/ComingSoonPage'

export default function AuditoriaPage() {
  const { t } = useTranslation('navigation')
  return <ComingSoonPage title={t('auditoria')} />
}
