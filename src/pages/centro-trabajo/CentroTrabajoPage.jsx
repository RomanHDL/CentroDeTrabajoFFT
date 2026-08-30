import { Menu } from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import BrandLogo from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cardClass, pageClass } from '@/lib/pageStyles'
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

          {/* Marca general de la plataforma (2026-08-29, cambio de branding a
              peticion explicita del usuario): "Centro de Control" / "CONTROL
              OPERATIVO" reemplaza el logo+titulo "Centro de Trabajo" que
              vivia aqui -- ver src/components/BrandLogo.jsx, fuente unica del
              branding. El MODULO sigue llamandose "Centro de Trabajo" (menu,
              rutas, tabs de esta misma pagina) -- solo cambia la marca. */}
          <BrandLogo variant="header" />

          <div className="min-w-[16px] flex-1" />

          <div className="flex flex-wrap items-center gap-1">
            <HeaderUserActions mode={mode} setMode={setMode} />
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
