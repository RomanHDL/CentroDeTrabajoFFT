import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { manualPanelClass } from '@/lib/pageStyles'
import { API_MAP, DATA_DICTIONARY } from './developerManualData'

// Developer Manual (MI Stack Reference, sección 14d, HARD RULE) -- ruta real
// en la app, contenido genuino (diccionario de datos de las 18 tablas reales
// de prisma/schema.prisma), no un stub. Ver developerManualData.js para el
// contenido -- este componente solo renderiza. Texto visible en namespace
// i18n "docs" (public/locales/*/docs.json).
export default function DeveloperManualPage() {
  const { t } = useTranslation('docs')

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">
        {t('developerManualPage.title')}
      </h1>
      <p className="mb-6 text-base text-muted-foreground">
        {t('developerManualPage.intro')}{' '}
        <Link to="/manual" className="text-primary underline">
          {t('developerManualPage.userManualLink')}
        </Link>
        .
      </p>

      <div className={`${manualPanelClass} mb-6`}>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          {t('developerManualPage.architectureHeading')}
        </h2>
        <p className="whitespace-pre-line text-sm text-foreground">
          {t('developerManualData.architectureOverview')}
        </p>
      </div>

      <div className={`${manualPanelClass} mb-6`}>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          {t('developerManualPage.authHeading')}
        </h2>
        <p className="whitespace-pre-line text-sm text-foreground">
          {t('developerManualData.authOverview')}
        </p>
      </div>

      <div className={`${manualPanelClass} mb-6`}>
        <h2 className="mb-2 text-xl font-bold text-foreground">
          {t('developerManualPage.apiMapHeading')}
        </h2>
        <Table>
          <TableBody>
            {API_MAP.map(([route, descKey]) => (
              <TableRow key={route}>
                <TableCell className="whitespace-nowrap font-mono text-[12.5px]">{route}</TableCell>
                <TableCell className="text-[13px]">{t(descKey)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="mb-3 text-xl font-bold text-foreground">
        {t('developerManualPage.dataDictionaryHeading', { count: DATA_DICTIONARY.length })}
      </h2>
      {DATA_DICTIONARY.map((entry) => (
        <div key={entry.model} className={`${manualPanelClass} mb-4`}>
          <p className="font-mono text-base font-bold text-foreground">{entry.model}</p>
          <p className="mb-3 text-[13px] text-muted-foreground">{t(entry.purposeKey)}</p>
          <hr className="mb-2 border-border" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground">
                  {t('developerManualPage.fieldColumn')}
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  {t('developerManualPage.typeColumn')}
                </TableHead>
                <TableHead className="text-xs font-bold text-foreground">
                  {t('developerManualPage.notesColumn')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.fields.map(([field, type, notes]) => (
                <TableRow key={field}>
                  <TableCell className="font-mono text-[12.5px]">{field}</TableCell>
                  <TableCell className="text-[12.5px]">{type}</TableCell>
                  <TableCell className="text-[12.5px] text-muted-foreground">{notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}
