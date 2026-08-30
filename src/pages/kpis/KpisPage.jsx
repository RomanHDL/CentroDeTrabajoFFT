import { useTranslation } from 'react-i18next'
import ComingSoonPage from '../shared/ComingSoonPage'

export default function KpisPage() {
  const { t } = useTranslation('navigation')
  return <ComingSoonPage title={t('kpis')} />
}
