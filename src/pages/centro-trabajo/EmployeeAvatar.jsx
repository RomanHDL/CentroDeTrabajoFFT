import { User } from 'lucide-react'
import { hexToRgba } from '@/lib/utils'

function initialsOf(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function colorForName(name) {
  const palette = ['#3B82F6', '#10B981', '#A855F7', '#F59E0B', '#06B6D4', '#EF4444']
  let hash = 0
  for (let i = 0; i < (name || '').length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]
}

/* Avatar de empleado — SIEMPRE iniciales sobre color estable (nunca foto), y si no hay
   nombre, icono generico. Nunca rompe la UI por falta de foto.

   2026-09-02 (a peticion explicita del usuario, "quita las fotos del personal... deja
   como antes las iniciales"): se quito el branch que mostraba employee.photoUrl como
   <img> -- volvio a mostrarse iniciales-siempre, como era el comportamiento original.

   Fase 6c: convertido directo a Tailwind (no una copia paralela) --
   es un primitivo visual autocontenido con 23 consumidores en toda la
   app (incluyendo src/components/OperatingFloorPlan.jsx/WorkAreaMap.jsx,
   fuera de src/pages/centro-trabajo), asi que su conversion beneficia de
   una sola vez a archivos que todavia no tienen su turno de Fase 6. */
export default function EmployeeAvatar({ employee, size = 56 }) {
  const name = employee?.name
  const style = { width: size, height: size }

  if (!employee) {
    return (
      <div
        className="grid shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground"
        style={style}
      >
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    )
  }

  const color = colorForName(name || employee.employeeNumber || '')
  const initials = initialsOf(name)
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-extrabold"
      style={{
        ...style,
        backgroundColor: hexToRgba(color, 0.15),
        color,
        fontSize: size * 0.34,
        border: `1px solid ${hexToRgba(color, 0.3)}`,
      }}
    >
      {initials || <User style={{ width: size * 0.5, height: size * 0.5 }} />}
    </div>
  )
}
