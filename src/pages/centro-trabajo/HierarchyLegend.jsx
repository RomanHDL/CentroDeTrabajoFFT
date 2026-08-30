import {
  ArrowLeftRight,
  Award,
  Heart,
  Settings,
  ShieldCheck,
  Star,
  User,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, hexToRgba } from '@/lib/utils'
import { getPersonnelRankOrder } from '../../data/personnel/rankSystem'

/* Rediseño "tablero operativo" (2026-08-28, a peticion explicita del
   usuario) -- SOLO lo usa LineLikeAreaDetail.jsx (areas LINE_LIKE:
   Paletizado/Accesorios/Insumos/Midea/Conveyor General). WC LINEA 0-10 y
   las 6 cards de soporte siguen usando su propia experiencia (LineDetailDrawer
   lineLike=false / SupportAreaDetail), nunca este componente.

   `iconKey` (rankSystem.js, campo aditivo) -> icono real, mapeo vive aqui
   (capa de presentacion), nunca en el archivo de datos.

   Fase 6c: convertido de MUI (Box/Stack/Typography + iconos @mui/icons-material
   + sx) a Tailwind + lucide-react. Iconos MUI -> lucide: WorkspacePremiumIcon
   -> Award, StarIcon -> Star, VerifiedUserIcon -> ShieldCheck, GroupsIcon ->
   Users, SettingsIcon -> Settings, PersonIcon -> User, FavoriteIcon -> Heart,
   CompareArrowsIcon -> ArrowLeftRight. rank.color es dinamico por dato
   (PERSONNEL_RANK_ORDER), asi que sigue resolviendose con hexToRgba()/style
   inline, nunca interpolando un className (mismo criterio que LineCard.jsx). */
export const RANK_ICONS = {
  headChief: Award,
  gerente: Star,
  supervisor: ShieldCheck,
  teamLeader: Users,
  compatibilidad: ArrowLeftRight,
  operador: Settings,
  ayudante: User,
  apoyo: Heart,
}

export function RankIcon({ rank, size = 15, className }) {
  const Icon = (rank && RANK_ICONS[rank.iconKey]) || User
  return (
    <Icon
      className={cn('shrink-0', className)}
      style={{ width: size, height: size, color: rank?.color }}
    />
  )
}

/* `dense`: fila compacta arriba de "Distribución de estaciones" (icono +
   label). `expanded`: lista con descripción corta, para el panel lateral
   de detalle -- mismo dato (PERSONNEL_RANK_ORDER), nunca un segundo mapa
   de texto paralelo. */
export default function HierarchyLegend({ expanded = false }) {
  const { t } = useTranslation('centroTrabajo')
  if (!expanded) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
          {t('hierarchyLegend.title')}
        </p>
        {getPersonnelRankOrder().map((rank) => (
          <div key={rank.key} className="flex items-center gap-1">
            <RankIcon rank={rank} />
            <p className="text-[11px] font-bold text-muted-foreground">{rank.label}</p>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
        {t('hierarchyLegend.expandedTitle')}
      </p>
      {getPersonnelRankOrder().map((rank) => (
        <div key={rank.key} className="flex items-center gap-2">
          <div
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
            style={{ backgroundColor: hexToRgba(rank.color, 0.12) }}
          >
            <RankIcon rank={rank} size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold leading-[1.25]" style={{ color: rank.color }}>
              {rank.label}
            </p>
            <p className="text-[10.5px] leading-[1.25] text-muted-foreground">{rank.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
