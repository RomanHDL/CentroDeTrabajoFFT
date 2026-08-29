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

/* Avatar de empleado — foto si existe (employee.photoUrl),
   si no iniciales sobre color estable, y si no hay ni
   nombre, icono generico. Nunca rompe la UI por falta de foto.

   Fase 6c: convertido directo a Tailwind (no una copia paralela) --
   es un primitivo visual autocontenido con 23 consumidores en toda la
   app (incluyendo src/components/OperatingFloorPlan.jsx/WorkAreaMap.jsx,
   fuera de src/pages/centro-trabajo), asi que su conversion beneficia de
   una sola vez a archivos que todavia no tienen su turno de Fase 6. */
export default function EmployeeAvatar({ employee, size = 56, dashed = false }) {
  const name = employee?.name
  const photoUrl = employee?.photoUrl
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

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ ...style, border: dashed ? '2px dashed hsl(var(--border))' : 'none' }}
      />
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
