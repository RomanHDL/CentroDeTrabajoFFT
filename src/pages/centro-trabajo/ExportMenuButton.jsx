import { Archive, BarChart3, Calendar, CalendarRange, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  exportCompleteExcel,
  exportDailyExcel,
  exportLineComparisonExcel,
  exportWeeklyExcel,
} from '../../data/production/excelExport'

/* Fase 6c: convertido de MUI (Button/Menu/MenuItem/ListItemIcon/ListItemText
   + sx) a Tailwind + shadcn/ui (DropdownMenu, mismo patron ya usado en
   LineWorkstationCard.jsx) + lucide-react. Sin estado de anchorEl manual --
   Radix DropdownMenu maneja su propio open/close (uncontrolled), y cada item
   cierra el menu solo al seleccionarse (mismo criterio de onClick directo
   en DropdownMenuItem ya usado en LineWorkstationCard.jsx). Iconos MUI ->
   lucide: FileDownloadIcon -> Download, TodayIcon -> Calendar, DateRangeIcon
   -> CalendarRange, BarChartIcon -> BarChart3, AllInboxIcon -> Archive. */
export default function ExportMenuButton({ dateISO }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-10 rounded-[20px] px-5">
          <Download className="h-4 w-4" />
          Descargar Excel
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px] rounded-[20px]">
        <DropdownMenuItem onClick={() => exportDailyExcel(dateISO)}>
          <Calendar className="mr-2 h-4 w-4" />
          Producción del día
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportWeeklyExcel(dateISO)}>
          <CalendarRange className="mr-2 h-4 w-4" />
          Producción semanal
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportLineComparisonExcel(dateISO)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Producción por línea
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportCompleteExcel(dateISO)}>
          <Archive className="mr-2 h-4 w-4" />
          Producción completa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
