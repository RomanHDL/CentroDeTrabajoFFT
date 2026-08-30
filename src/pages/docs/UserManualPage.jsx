import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { manualPanelClass } from '@/lib/pageStyles'
import { FAQ, MODULES } from './userManualData'

// User Manual (MI Stack Reference, sección 17a, HARD RULE) -- ruta real,
// contenido genuino del estado actual de cada módulo. Ver userManualData.js.
export default function UserManualPage() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">Manual de Usuario</h1>
      <p className="mb-6 text-base text-muted-foreground">
        Cómo usar Centro de Trabajo FFT.{' '}
        <Link to="/developer-manual" className="text-primary underline">
          Ver el Developer Manual
        </Link>
        .
      </p>

      {MODULES.map((mod) => (
        <div key={mod.name} className={`${manualPanelClass} mb-4`}>
          <div className="mb-2 flex items-center gap-2">
            <p className="font-bold text-foreground">{mod.name}</p>
            <Badge variant={mod.status === 'disponible' ? 'success' : 'outline'}>
              {mod.status}
            </Badge>
          </div>
          <p className="whitespace-pre-line text-sm text-foreground">{mod.body}</p>
        </div>
      ))}

      <h2 className="mb-3 mt-6 text-xl font-bold text-foreground">Preguntas frecuentes</h2>
      {FAQ.map(([q, a]) => (
        <div key={q} className={`${manualPanelClass} mb-4`}>
          <p className="mb-1 text-sm font-bold text-foreground">{q}</p>
          <p className="text-sm text-muted-foreground">{a}</p>
        </div>
      ))}
    </div>
  )
}
