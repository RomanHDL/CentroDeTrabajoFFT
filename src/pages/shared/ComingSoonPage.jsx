import { Construction } from 'lucide-react'
import { cardClass, pageClass, pageTitleClass } from '@/lib/pageStyles'
import EmptyState from '../../ui/EmptyState'

/* Modulo "solo navegacion" (2026-08-28, a peticion explicita del usuario):
   KPI's / Asistencia / Auditoria se agregan al registro/rutas/sidebar
   YA, pero su contenido real todavia no se construye -- "por ahora no
   desarrollar el contenido... solo crear los modulos/rutas necesarias
   para poder acceder a ellos". Un solo componente compartido (reutiliza
   EmptyState/pageStyles, mismo encabezado que el resto de paginas)
   para no triplicar el mismo marcado en 3 archivos -- cada pagina real
   solo le pasa su titulo.

   Fase 6c: portado de MUI a Tailwind (mismo componente para los 3
   consumidores, ninguno necesita su propio cambio). */
export default function ComingSoonPage({ title }) {
  return (
    <div className={pageClass}>
      <div className="mb-5">
        <p className={pageTitleClass}>{title}</p>
      </div>
      <div className={`${cardClass} mx-auto max-w-[520px]`}>
        <EmptyState
          icon={<Construction />}
          title="Trabajando en ello"
          description="Este módulo se encuentra actualmente en desarrollo."
        />
      </div>
    </div>
  )
}
