import { Ban } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Ban className="h-12 w-12 text-destructive" />
      <p className="text-xl font-extrabold text-foreground">Acceso no autorizado</p>
      <p className="max-w-[420px] text-base text-muted-foreground">
        Tu rol no tiene permiso para ver esta sección.
      </p>
    </div>
  )
}
