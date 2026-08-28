import DashboardIcon from '@mui/icons-material/Dashboard'
import FactoryIcon from '@mui/icons-material/Factory'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import GroupIcon from '@mui/icons-material/Group'
import MapIcon from '@mui/icons-material/Map'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

// Mapea el string `icon` de MODULE_REGISTRY (shared/moduleRegistry.js) al
// componente MUI real -- el registro no puede importar JSX (debe ser
// importable tambien desde Node/api), asi que la traduccion vive aqui.
const ICONS = {
  Dashboard: DashboardIcon,
  Factory: FactoryIcon,
  PersonAddAlt1: PersonAddAlt1Icon,
  Group: GroupIcon,
  Map: MapIcon,
  QueryStats: QueryStatsIcon,
  EventAvailable: EventAvailableIcon,
  FactCheck: FactCheckIcon,
}

export function getModuleIcon(iconKey) {
  return ICONS[iconKey] || HelpOutlineIcon
}
