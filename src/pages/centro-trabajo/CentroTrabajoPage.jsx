import { Factory, LayoutGrid, Menu } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cardClass, pageClass, pageSubtitleClass, pageTitleClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import HeaderUserActions from '../../layout/HeaderUserActions'
import RotateDeviceHint from '../../ui/RotateDeviceHint'
import AreaDetail from './AreaDetail'
import AreasLayoutView from './AreasLayoutView'
import BajasTab from './BajasTab'
import EstacionesTab from './EstacionesTab'
import LineasTab from './LineasTab'
import PersonalDeHoyTab from './PersonalDeHoyTab'
import { useSelectedWorkCenter } from './useSelectedWorkCenter'

const TABS = [
  { key: 'areas', label: 'Áreas de trabajo' },
  { key: 'lineas', label: 'Líneas' },
  { key: 'estaciones', label: 'Estaciones' },
  { key: 'personal', label: 'Personal' },
  { key: 'bajas', label: 'Bajas' },
]

/* Centro de Trabajo = OPERACION. Sin KPIs ejecutivos, sin produccion,
   sin tendencias, sin alertas — eso vive en Dashboard. Aqui solo se
   administra/consulta el entorno: areas, lineas, estaciones y
   personal, con datos reales (snapshot de BASE + asignacion diaria
   real cuando exista). */
export default function CentroTrabajoPage() {
  const [tab, setTab] = useState('areas')
  const {
    workCenterId: selectedLine,
    openWorkCenter: setSelectedLine,
    closeWorkCenter,
  } = useSelectedWorkCenter()
  /* 2026-08-27 ("rediseño del header de Centro de Trabajo", a peticion
     explicita del usuario): mode/setMode + apertura del sidebar movil
     vienen de AppLayout.jsx via <Outlet context={...}> -- esta pagina es
     la UNICA que oculta la barra superior global y construye su propio
     header (logo+titulo+subtitulo+acciones+tabs, todo en la misma card),
     reutilizando exactamente el mismo estado/handlers que ya vivian en
     AppLayout (nunca duplicados, ver HeaderUserActions.jsx). */
  const { mode, setMode, onOpenMobileSidebar, showMobileMenuButton } = useOutletContext()

  return (
    <div className={pageClass}>
      <div className={cn(cardClass, 'mb-4 rounded-[20px]')}>
        <div className="flex flex-wrap items-center gap-3 px-3.5 py-3 md:px-6 md:py-4">
          {showMobileMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMobileSidebar}
              className="h-9 w-9 shrink-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Logo + titulo: mismo simbolo/color que antes vivian en la barra
              superior global (Factory, #3B82F6), un poco mas grande aqui
              para darle identidad al nuevo header principal. Hover sutil
              (seccion "EFECTO DEL LOGO + TITULO" del pedido) -- puramente
              decorativo, sin navegacion asociada. */}
          <div className="group flex items-center gap-2.5 rounded-[25px] px-2 py-1 transition-colors duration-200 hover:bg-blue-500/[0.06] dark:hover:bg-blue-500/[0.1]">
            <Factory className="h-[30px] w-[30px] shrink-0 text-blue-500 transition-[transform,filter] duration-200 group-hover:scale-105 group-hover:drop-shadow-[0_0_6px_rgba(59,130,246,.45)]" />
            <div className="min-w-0">
              <p
                className={cn(
                  pageTitleClass,
                  'text-[1.15rem] transition-colors duration-200 group-hover:text-blue-500 sm:text-[1.4rem]',
                )}
              >
                Centro de Trabajo
              </p>
              <p className={pageSubtitleClass}>
                Organización operativa por áreas, líneas, estaciones y personal
              </p>
            </div>
          </div>

          <div className="min-w-[16px] flex-1" />

          <div className="flex flex-wrap items-center gap-1">
            <HeaderUserActions mode={mode} setMode={setMode} />
            {/* Acceso directo al layout/plano (Áreas de trabajo) desde
                cualquier pestaña -- a peticion explicita del usuario
                (2026-08-24, mockup de la pestaña Lineas). Misma ruta/handler
                de siempre (setTab('areas')), solo se le agrega hover. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTab('areas')}
              className="ml-2 shrink-0 gap-1.5 rounded-[25px] font-bold transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:bg-blue-500/[0.06] dark:hover:bg-blue-500/[0.14]"
            >
              <LayoutGrid className="h-[17px] w-[17px]" />
              Ver layout general
            </Button>
          </div>
        </div>

        <div className="border-t border-border px-2 md:px-4">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="overflow-x-auto">
              <TabsList className="h-auto w-max gap-1 rounded-none bg-transparent p-0">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className="h-[46px] rounded-none border-b-2 border-transparent px-3 text-[13.5px] font-semibold text-muted-foreground data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </div>
      </div>

      {tab === 'areas' && (
        <>
          {/* Solo aqui: el mapa de areas (OperatingFloorPlan) esta pensado
              para pantallas anchas (10 lineas + zonas lado a lado); las
              demas tabs (Lineas/Estaciones/Personal) son listas/tablas que
              funcionan bien en portrait, no necesitan el aviso. */}
          <RotateDeviceHint />
          <AreasLayoutView onOpenLine={setSelectedLine} />
        </>
      )}
      {tab === 'lineas' && <LineasTab onOpenLine={setSelectedLine} />}
      {tab === 'estaciones' && (
        <EstacionesTab onOpenLine={setSelectedLine} onGoToLineas={() => setTab('lineas')} />
      )}
      {tab === 'personal' && (
        <PersonalDeHoyTab onGoToBajas={() => setTab('bajas')} onGoToAreas={() => setTab('areas')} />
      )}
      {tab === 'bajas' && <BajasTab />}

      <AreaDetail
        workCenterId={selectedLine}
        open={Boolean(selectedLine)}
        onClose={closeWorkCenter}
        onNavigate={setSelectedLine}
      />
    </div>
  )
}
