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
import {
  API_MAP,
  ARCHITECTURE_OVERVIEW,
  AUTH_OVERVIEW,
  DATA_DICTIONARY,
} from './developerManualData'

// Developer Manual (MI Stack Reference, sección 14d, HARD RULE) -- ruta real
// en la app, contenido genuino (diccionario de datos de las 18 tablas reales
// de prisma/schema.prisma), no un stub. Ver developerManualData.js para el
// contenido -- este componente solo renderiza.
export default function DeveloperManualPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">Developer Manual</h1>
      <p className="mb-6 text-base text-muted-foreground">
        Arquitectura y diccionario de datos real de Centro de Trabajo FFT.{' '}
        <Link to="/manual" className="text-primary underline">
          Ver el Manual de Usuario
        </Link>
        .
      </p>

      <div className={`${manualPanelClass} mb-6`}>
        <h2 className="mb-2 text-xl font-bold text-foreground">Arquitectura</h2>
        <p className="whitespace-pre-line text-sm text-foreground">{ARCHITECTURE_OVERVIEW}</p>
      </div>

      <div className={`${manualPanelClass} mb-6`}>
        <h2 className="mb-2 text-xl font-bold text-foreground">Autenticación</h2>
        <p className="whitespace-pre-line text-sm text-foreground">{AUTH_OVERVIEW}</p>
      </div>

      <div className={`${manualPanelClass} mb-6`}>
        <h2 className="mb-2 text-xl font-bold text-foreground">Mapa de la API</h2>
        <Table>
          <TableBody>
            {API_MAP.map(([route, desc]) => (
              <TableRow key={route}>
                <TableCell className="whitespace-nowrap font-mono text-[12.5px]">{route}</TableCell>
                <TableCell className="text-[13px]">{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <h2 className="mb-3 text-xl font-bold text-foreground">
        Diccionario de datos ({DATA_DICTIONARY.length} tablas)
      </h2>
      {DATA_DICTIONARY.map((entry) => (
        <div key={entry.model} className={`${manualPanelClass} mb-4`}>
          <p className="font-mono text-base font-bold text-foreground">{entry.model}</p>
          <p className="mb-3 text-[13px] text-muted-foreground">{entry.purpose}</p>
          <hr className="mb-2 border-border" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-bold text-foreground">Campo</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Tipo</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Notas</TableHead>
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
