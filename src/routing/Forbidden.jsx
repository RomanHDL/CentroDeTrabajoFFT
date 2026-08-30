import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function Forbidden() {
  const { t } = useTranslation('app')

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Ban className="h-12 w-12 text-destructive" />
      <p className="text-xl font-extrabold text-foreground">{t('forbidden.title')}</p>
      <p className="max-w-[420px] text-base text-muted-foreground">{t('forbidden.description')}</p>
    </div>
  )
}
