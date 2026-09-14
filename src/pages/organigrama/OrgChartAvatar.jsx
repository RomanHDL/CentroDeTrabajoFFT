import { cn } from '@/lib/utils'

// Avatar compartido del organigrama (2026-09-14): usado tanto por las tarjetas del arbol como
// por el modal de perfil, para que una foto subida se vea igual en los dos lugares. `photoSrc`
// (calculado en orgChartPhotos.js, mezclando la foto real de OrgChartPhoto con la estatica de
// orgChartData.js) tiene prioridad sobre `person.photo`; si ninguna existe, iniciales -- nunca
// una imagen rota.
export function initialsOf(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export default function OrgChartAvatar({ person, photoSrc, size, className, borderClassName }) {
  const src = photoSrc !== undefined ? photoSrc : person.photo
  const style = size ? { width: size, height: size, minWidth: size } : undefined
  const border = borderClassName || 'border-[3px] border-blue-500'
  if (src) {
    return (
      <img
        src={src}
        alt={person.name}
        style={style}
        className={cn('rounded-full object-cover object-center', border, className)}
      />
    )
  }
  return (
    <div
      style={style}
      className={cn(
        'flex items-center justify-center rounded-full bg-blue-500/10 font-bold text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
        border,
        className,
      )}
    >
      {initialsOf(person.name)}
    </div>
  )
}
