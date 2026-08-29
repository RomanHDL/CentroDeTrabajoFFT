import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import PersonIcon from '@mui/icons-material/Person'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { alpha } from '@mui/material/styles'
import { usePersonnelVersion } from '../data/personnel/usePersonnelVersion'
import {
  workCenterById,
  WORK_CENTERS,
  canonicalOperationalAreaId,
  operationalGroupMembers,
  AREA_STATION_SOURCE_OVERRIDE,
} from '../data/production/catalog'
import {
  getAreaHeadcount,
  getAreaStaffing,
  getPeopleByArea,
  hasAnyPersonnelToday,
  getStaffingTotals,
  getFftPeopleWithLine,
  getGroupAreaStaffing,
  getGroupPeople,
} from '../data/production/personnelByArea'
import { FFT_LINE_IDS, SUPPORT_CARD_AREA_IDS } from '../data/production/floorPlanZones'
import { getLineWorkstationsWithOccupancy } from '../data/personnel/repository'
import { getPersonnelRank } from '../data/personnel/rankSystem'
import { useEmployeeDropTarget } from '../ui/dnd'
import DraggablePersonChip from '../ui/DraggablePersonChip'
import EmployeeAvatar from '../pages/centro-trabajo/EmployeeAvatar'
import { useSelectedWorkCenter } from '../pages/centro-trabajo/useSelectedWorkCenter'

/* ─────────────────────────────────────────────
   "Área operando" -- plano 2D completo (rediseño 2026-08-24 a partir
   del mockup que el usuario compartió). Componente compartido: vive en
   Layout2DPage (ruta /layout-2d) y en Centro de Trabajo > Áreas de
   trabajo (AreasLayoutView.jsx, reemplazo de WorkAreaMap, 2026-08-25) --
   una sola fuente de verdad visual, nunca dos planos que puedan
   desincronizarse. Cada pagina solo monta <OperatingFloorPlan /> dentro
   de su propio contenedor (cada una le pone su propio Paper de tarjeta
   por fuera). Ya NO vive en el Dashboard (se quito de ahi a peticion
   explicita del usuario, 2026-08-25) -- readOnly sigue existiendo como
   capacidad del componente por si algun consumidor futuro lo necesita
   de solo lectura, pero hoy ningun caller real lo usa.

   Decisiones explícitas del usuario (2026-08-24, salvo donde se anota):
   - 2026-08-28 ("Corregir diseño y estructura del Conveyor General"):
     la decision de "los dos conveyors son solo decoracion, prohibido
     crear card" se REVIERTE explicitamente -- ahora existe UN solo
     bloque real "CONVEYOR GENERAL" (ver ConveyorGeneralBar), con sus 2
     puestos reales ("Ayudante General de Conveyor", ver
     AREA_STATION_SOURCE_OVERRIDE en catalog.js -- viven fisicamente en
     WC Paletizado, esto es solo una VENTANA hacia ellos). Alineado por
     CSS Grid (misma fila del grid que fft/highvalue/palletizing, ver
     gridTemplateAreas mas abajo -- nunca un ancho en % calculado a ojo).
     2026-08-28, segunda correccion: pasa de "inicio de WC LINEA 2 -- fin
     de WC Midea" a "de extremo a extremo" (columna 1 a 15 completas,
     inicio de WC LINEA 1 -- fin de WC Paletizado), a peticion explicita
     del usuario.
   - "WC Sellado" no aparece en este módulo bajo ninguna forma.
   Ver floorPlanZones.js para el detalle completo de estas exclusiones
   y los ajustes de fusion/intercambio de cajas (Paletizado, Insumos+
   Suministro, Midea+Mixtos, Accesorios).

   Los conteos en vivo salen de las mismas funciones que ya usan
   AreaSummaryStrip/WorkAreaMap (personnelByArea.js) -- ninguna fuente
   de datos paralela; usePersonnelVersion() cubre tanto cambios
   locales como el sondeo del backend real (Fase 2) sin plomería
   extra. */

const STATUS_META = {
  COMPLETA: { color: '#10B981', label: 'Completa', description: 'Cobertura completa' },
  FALTA: { color: '#EF4444', label: 'Falta personal', description: 'Faltan asignaciones' },
  PARCIAL: { color: '#3B82F6', label: 'Parcial', description: 'Asignación parcial' },
  SIN_PERSONAL: { color: '#94A3B8', label: 'Sin personal', description: 'Sin personal asignado' },
}

/* 4 estados a partir de real/ideal (2026-08-24, a peticion del
   usuario) -- getAreaStaffing() de personnelByArea.js solo distingue
   COMPLETA/FALTAN/SIN_PLANTILLA; esta clasificacion mas fina es
   puramente de presentacion para este modulo, no cambia esa funcion
   compartida. null cuando el area no tiene plantilla oficial (se
   muestra aparte, sin barra de estado). */
function statusFor(real, ideal) {
  if (ideal == null) return null
  if (real <= 0) return 'SIN_PERSONAL'
  if (real >= ideal) return 'COMPLETA'
  if (real >= ideal - 1 || real / ideal >= 0.75) return 'PARCIAL'
  return 'FALTA'
}

function statusText(status, staffing) {
  if (!status) return null
  if (status === 'COMPLETA' || status === 'SIN_PERSONAL') return STATUS_META[status].label
  return `${STATUS_META[status].label} · Faltan ${staffing.ideal - staffing.real}`
}

// 2026-08-26 ("Reestructuracion operativa FFT"): se excluyen tambien las
// areas `active:false` sin fusion (SOPORTE, archivada de verdad) -- las
// fusionadas (BOX_PREP/SUMINISTRO_MATERIAL, canonico=INSUMOS) se quedan,
// su personal real sigue siendo personal real, solo ahora conceptualmente
// pertenece a Insumos (mismo criterio que getStaffingTotals()).
// CONVEYOR_PRINCIPAL/CONVEYOR_SECUNDARIO/SELLADO se excluyen SIEMPRE de
// aqui, sin importar su `active` (2026-08-28, "corrección navegación
// Conveyor General": CONVEYOR_PRINCIPAL volvio a `active:true` pero sus 2
// puestos reales siguen viviendo en Paletizado -- getAreaHeadcount('PALETIZADO')
// ya los cuenta; si tambien se sumara getAreaHeadcount('CONVEYOR_PRINCIPAL')
// aqui se duplicarian en el total "N personas" del encabezado).
const SHOWN_AREA_IDS = WORK_CENTERS.filter(
  (w) => w.id !== 'CONVEYOR_PRINCIPAL' && w.id !== 'CONVEYOR_SECUNDARIO' && w.id !== 'SELLADO',
)
  .filter((w) => w.active !== false || canonicalOperationalAreaId(w.id) !== w.id)
  .map((w) => w.id)

/* readOnly: por defecto false (interactivo) -- ni Layout2DPage.jsx ni
   AreasLayoutView.jsx (Centro de Trabajo) lo pasan, ambos quieren
   click/drag&drop/asignar. Se conserva la capacidad de solo lectura por
   si algun consumidor futuro la necesita (era la usada por el Dashboard
   hasta que se le quito el layout, 2026-08-25). */
export default function OperatingFloorPlan({ readOnly = false }) {
  usePersonnelVersion()
  /* 2026-08-27 (a peticion explicita del usuario): el click directo en
     una zona del plano ahora abre el detalle a traves del MISMO estado
     compartido (?area= en la URL) que ya usa CentroTrabajoPage.jsx --
     antes este componente tenia su propio useState local (assignAreaId)
     e instanciaba su PROPIO <AreaDetail>, completamente desconectado de
     lo que las pestañas "Lineas"/"Estaciones" creian abierto (un click
     aqui nunca actualizaba esa otra vista). openWorkCenter() solo
     actualiza la URL; el UNICO <AreaDetail> que de verdad se renderiza
     para /centro-trabajo sigue viviendo en CentroTrabajoPage.jsx. */
  const { openWorkCenter } = useSelectedWorkCenter()
  const [zoom, setZoom] = useState(1)
  const [autoZoom, setAutoZoom] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const planRef = useRef(null)
  const floorRef = useRef(null)

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else planRef.current?.requestFullscreen?.()
  }

  /* "Ajustar vista" real (2026-08-25, a peticion explicita del usuario):
     calcula la escala a partir del ancho disponible del contenedor y el
     ancho natural del plano (floorRef, sin transform -- transform no
     afecta el layout box, solo el pintado, asi que scrollWidth siempre
     da el tamaño real sin escalar). Nunca oculta contenido: solo ajusta
     escala; si el contenedor es mas angosto que el plano, la escala baja
     pero el usuario siempre puede hacer scroll interno para ver el resto.
     Se recalcula solo, mientras el usuario no haya tocado +/- a mano
     (autoZoom), para reaccionar a resize/rotacion de tablet sin pisar un
     zoom manual. */
  function computeFit() {
    const container = planRef.current
    const floor = floorRef.current
    if (!container || !floor || !floor.scrollWidth) return 1
    const availableWidth = container.clientWidth - 4
    return Math.max(0.5, Math.min(1.4, +(availableWidth / floor.scrollWidth).toFixed(2)))
  }

  function fitToScreen() {
    setAutoZoom(true)
    setZoom(computeFit())
  }

  useEffect(() => {
    const container = planRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    let frame = null
    const observer = new ResizeObserver(() => {
      if (!autoZoom) return
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setZoom(computeFit()))
    })
    observer.observe(container)
    setZoom(computeFit())
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoZoom])

  // Click en cualquier zona con area real (2026-08-25, a peticion explicita
  // del usuario: arrastrar Y asignar debe funcionar en TODAS las zonas de
  // Layout 2D, igual que en Centro de Trabajo -- antes solo Conveyor
  // Principal/Secundario lo permitian). En readOnly (Dashboard) se comporta
  // EXACTAMENTE igual que siempre: solo abre el detalle de solo lectura.
  function handleZoneOpen(areaId) {
    if (readOnly) {
      setDetailId(areaId)
      return
    }
    openWorkCenter(areaId)
  }

  const operating = hasAnyPersonnelToday()
  const totals = getStaffingTotals()
  const totalPeople = SHOWN_AREA_IDS.reduce((sum, id) => sum + getAreaHeadcount(id), 0)

  return (
    <Box sx={{ p: 2.5 }}>
      {/* Leyenda superior (2026-08-25, correccion definitiva a peticion
          explicita del usuario): UNICA leyenda del plano -- reemplaza el
          aviso azul de "mapeo no confirmado" que vivia aqui antes (se
          quito por completo, no aporta nada operativo al dia a dia) y a
          la vieja leyenda flotante de abajo (eliminada, ver mas abajo:
          ya no existe showLegend/Paper de "Referencias" al fondo). Los
          totales (personas/cobertura) son los mismos que ya se
          calculaban arriba -- ninguna fuente de datos nueva. */}
      <Paper
        elevation={0}
        sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          spacing={2}
          rowGap={1.25}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: operating ? '#10B981' : '#94A3B8',
              }}
            />
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>Área operando</Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={2.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ flex: 1, justifyContent: 'center' }}
          >
            {Object.values(STATUS_META).map((meta) => (
              <LegendItem
                key={meta.label}
                color={meta.color}
                label={meta.label}
                description={meta.description}
              />
            ))}
            <LegendItem
              icon={<InfoOutlinedIcon sx={{ fontSize: 15 }} />}
              label="Referencias"
              description="Áreas de referencia"
            />
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
            <InfoStat
              icon={<PeopleAltIcon sx={{ fontSize: 16 }} />}
              value={`${totalPeople} personas`}
              label="Total asignadas"
            />
            <InfoStat
              value={`${totals.realTotal} / ${totals.idealTotal}`}
              label="Cobertura del catálogo"
            />
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Button
          size="small"
          startIcon={<CenterFocusStrongIcon fontSize="small" />}
          onClick={fitToScreen}
          sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary', minHeight: 36 }}
        >
          Ajustar vista
        </Button>
        <Tooltip title="Alejar">
          <IconButton
            sx={{ width: 36, height: 36 }}
            onClick={() => {
              setAutoZoom(false)
              setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))
            }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </Typography>
        <Tooltip title="Acercar">
          <IconButton
            sx={{ width: 36, height: 36 }}
            onClick={() => {
              setAutoZoom(false)
              setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
          <IconButton sx={{ width: 36, height: 36 }} onClick={toggleFullscreen}>
            {isFullscreen ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        ref={planRef}
        sx={{
          bgcolor: 'background.paper',
          overflow: 'auto',
          overscrollBehaviorX: 'contain',
          ...(isFullscreen ? { p: 2.5, height: '100vh' } : {}),
        }}
      >
        <Box
          sx={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform .15s ease',
            width: `${100 / zoom}%`,
          }}
        >
          <FloorPlan
            floorRef={floorRef}
            onOpen={handleZoneOpen}
            onOpenSummary={setDetailId}
            readOnly={readOnly}
          />
        </Box>
      </Box>

      <DetailDialog areaId={detailId} onClose={() => setDetailId(null)} />
    </Box>
  )
}

/* Item de leyenda de dos lineas (etiqueta + descripcion), a partir del
   mockup que el usuario compartio 2026-08-25 -- reemplaza los Chips de
   una sola linea que habia antes. */
function LegendItem({ color, icon, label, description }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start">
      {icon || (
        <Box
          sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, mt: 0.4, flexShrink: 0 }}
        />
      )}
      <Stack spacing={0}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.2 }}>{label}</Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.2 }}>
          {description}
        </Typography>
      </Stack>
    </Stack>
  )
}

/* Bloque de totales (personas asignadas / cobertura del catalogo) --
   mismos valores ya calculados arriba (totalPeople, totals), solo
   presentacion nueva a dos lineas junto a la leyenda. */
function InfoStat({ icon, value, label }) {
  return (
    <Stack alignItems="flex-end" spacing={0}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {icon}
        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{value}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{label}</Typography>
    </Stack>
  )
}

function FloorPlan({ floorRef, onOpen, onOpenSummary, readOnly }) {
  return (
    <Box ref={floorRef} sx={{ minWidth: 1180 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns:
            'minmax(90px,0.7fr) minmax(90px,0.7fr) repeat(10, minmax(56px,1fr)) minmax(150px,1.1fr) minmax(108px,0.8fr) minmax(190px,1.3fr)',
          /* minmax(_, auto) en vez de px fijo (2026-08-25, correccion
             definitiva a peticion explicita del usuario): esa altura sigue
             siendo el piso normal de siempre, pero ya nunca es un techo que
             recorte personal en silencio si una caja necesita mas espacio --
             cada lista interna ya tiene su propio scroll (PersonList,
             overflow:auto), esto es solo una red de seguridad adicional.
             Fila 0 (2026-08-28, "Corregir diseño y estructura del Conveyor
             General", a peticion explicita del usuario): antes las 2 barras
             de Conveyor vivian FUERA de este grid (Stack de ancho libre, sin
             relacion real con las columnas de abajo). Ahora "conveyor" es
             una fila mas de ESTE MISMO grid -- por eso su alineacion con
             WC LINEA2..10/WC Midea es exacta incluso si cambia el viewport,
             nunca un porcentaje calculado a ojo. */
          gridTemplateRows: 'auto minmax(250px, auto) minmax(160px, auto)',
          /* Fila 2 (2026-08-26, "Reestructuracion operativa FFT", a peticion
             explicita del usuario): antes eran 4 celdas independientes
             (pnp/boxprep/stock/accessories) -- ahora "insumos" (fusion de
             PNP/POC/PEN + Box Prep + Insumos + Suministro de material, ver
             InsumosSuministroZone) ocupa las primeras 7 columnas (desde
             donde empezaba PNP hasta aproximadamente donde termina, arriba,
             la 5a columna del bloque FFT -- Parte 27 del pedido) y
             "accessories" ocupa las 7 columnas siguientes (Parte 28: se
             extiende "hasta Línea 6"). Las columnas de FFT/highvalue/
             palletizing (fila 1) NO se tocaron -- solo se redistribuyo el
             span interno de la fila 2 sobre las mismas 15 columnas de
             siempre, sin overlap (verificado: 7+7+1=15).
             Fila 0 ("conveyor", 2026-08-28, segunda correccion, a peticion
             explicita del usuario -- "de extremo a extremo... que empiece
             desde WC LINEA 1 y termine en WC Paletizado"): ocupa las 15
             columnas completas -- desde la columna 1 (donde arranca el area
             "paletizado", que dibuja WC LINEA 1 arriba de WC LINEA 0) hasta
             la columna 15 (area "palletizing", WC Paletizado). Antes dejaba
             "." en columnas 1-2 y 15 para no invadir esas dos cards; ahora
             las cubre por completo (edge-to-edge del grid), a peticion
             explicita del usuario -- las cards de abajo (fila 1/2) no
             cambian de posicion/tamaño, el Conveyor solo pasa por ENCIMA de
             ellas en su propia fila. */
          gridTemplateAreas: `
            "conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor"
            "paletizado paletizado fft fft fft fft fft fft fft fft fft fft highvalue highvalue palletizing"
            "insumos insumos insumos insumos insumos insumos insumos accessories accessories accessories accessories accessories accessories accessories palletizing"
          `,
        }}
      >
        <ConveyorGeneralBar gridArea="conveyor" onOpen={onOpen} readOnly={readOnly} />

        <Box sx={{ gridArea: 'paletizado', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <HorizontalLineBar lineId="LINEA1" onOpen={onOpen} readOnly={readOnly} />
          <HorizontalLineBar
            lineId="PROYECTO"
            title="WC LINEA 0"
            onOpen={onOpen}
            readOnly={readOnly}
          />
        </Box>

        <FftBlock onOpen={onOpen} onOpenSummary={onOpenSummary} readOnly={readOnly} />

        <BigZone
          areaId="HIGH_VALUE"
          gridArea="highvalue"
          title="WC Midea / High Value"
          onOpen={onOpen}
          readOnly={readOnly}
        >
          <Stack sx={{ height: '100%', minHeight: 0 }}>
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Box sx={{ flex: 1.4, minWidth: 0 }}>
                <HighValueGrid areaId="HIGH_VALUE" />
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  borderLeft: '1px dashed',
                  borderColor: 'divider',
                  pl: 1,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 9.5,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  Productos Mixtos
                </Typography>
                <MixtosDecoration />
              </Box>
            </Stack>
            {/* Nombres reales debajo de la cuadricula decorativa (2026-08-25, a
                peticion explicita del usuario: si hay personal en cualquier
                area, debe verse su nombre igual que en WC Accesorios, no solo
                un indicador visual abstracto). */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflow: 'auto',
                mt: 0.75,
                pt: 0.75,
                borderTop: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <PersonList areaId="HIGH_VALUE" columns={2} readOnly={readOnly} />
            </Box>
          </Stack>
        </BigZone>

        <BigZone
          areaId="PALETIZADO"
          gridArea="palletizing"
          title="WC Paletizado (Palletizing)"
          onOpen={onOpen}
          readOnly={readOnly}
        >
          <PersonList areaId="PALETIZADO" columns={2} readOnly={readOnly} />
        </BigZone>

        <InsumosSuministroZone
          gridArea="insumos"
          onOpen={onOpen}
          onOpenSummary={onOpenSummary}
          readOnly={readOnly}
        />

        <BigZone
          areaId="ACCESORIOS"
          gridArea="accessories"
          title="WC Accesorios"
          onOpen={onOpen}
          readOnly={readOnly}
        >
          <PersonList areaId="ACCESORIOS" columns={2} readOnly={readOnly} />
        </BigZone>
      </Box>

      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {SUPPORT_CARD_AREA_IDS.map((id) => (
            <SupportCard key={id} areaId={id} onOpen={onOpen} readOnly={readOnly} />
          ))}
        </Stack>
      </Box>
    </Box>
  )
}

/* WC Conveyor General -- UN SOLO bloque (2026-08-28, "Corregir diseño y
   estructura del Conveyor General", a peticion explicita del usuario:
   reemplaza las 2 barras decorativas "CONVEYOR PRINCIPAL"/"CONVEYOR
   SECUNDARIO" de antes). Mismo lenguaje visual que BigZone (fondo segun
   estado, borde superior de color, hover con box-shadow) para no introducir
   un estilo nuevo, pero MAS compacto (menos padding, sin PersonList de lista
   larga).

   2026-08-28 ("corrección navegación Conveyor General", tercera ronda, a
   peticion explicita del usuario -- CORRIGE un bug reportado, NO la decision
   de fondo de la ronda anterior): esta barra sigue leyendo EXACTAMENTE los 2
   puestos reales "Ayudante General de Conveyor" que viven dentro de
   CUSTOM_STATION_PLANS.PALETIZADO (AREA_STATION_SOURCE_OVERRIDE.CONVEYOR_PRINCIPAL,
   catalog.js -- misma fuente que usa el header del bloque abajo, nunca
   hardcodeada dos veces) -- eso NO cambio, sigue siendo "una sola fuente
   real de asignación", nunca doble conteo. Lo que SI cambio: click en el
   bloque O en cualquier posicion ahora abre CONVEYOR_PRINCIPAL (su propia
   pantalla de detalle, LineLikeAreaDetail via onOpen -- ver
   AREA_STATION_SOURCE_OVERRIDE en ese componente para como lee los mismos 2
   puestos desde Paletizado), NO WC Paletizado completo -- bug reportado por
   el usuario ("me manda incorrectamente a WC Paletizado"). drag&drop sigue
   escribiendo en el area real (Paletizado, via el mismo override) -- eso
   tampoco cambio. */
const CONVEYOR_ROLE = 'Ayudante General de Conveyor'
const CONVEYOR_SOURCE_AREA_ID = AREA_STATION_SOURCE_OVERRIDE.CONVEYOR_PRINCIPAL.sourceAreaId

function ConveyorGeneralBar({ gridArea, onOpen, readOnly }) {
  const stations = getLineWorkstationsWithOccupancy(CONVEYOR_SOURCE_AREA_ID).filter(
    (w) => w.role === CONVEYOR_ROLE,
  )
  const real = stations.filter((w) => w.occupants.length > 0).length
  const ideal = stations.length
  const status = statusFor(real, ideal)
  const color = status ? STATUS_META[status].color : '#94A3B8'
  const label = `${real} / ${ideal}`
  const { isOver, dropProps } = useEmployeeDropTarget(readOnly ? null : CONVEYOR_SOURCE_AREA_ID)

  return (
    <Box
      {...(readOnly ? {} : dropProps)}
      onClick={() => onOpen('CONVEYOR_PRINCIPAL')}
      sx={{
        gridArea,
        borderRadius: 2,
        p: 1,
        cursor: 'pointer',
        userSelect: 'none',
        border: '1px solid',
        borderColor: isOver ? '#3B82F6' : alpha(color, 0.35),
        borderTop: `3px solid ${color}`,
        bgcolor: isOver
          ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08)
          : (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        transition: 'box-shadow .15s ease, background-color .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 12.5, letterSpacing: 0.4 }}>
          CONVEYOR GENERAL
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
          {isOver ? 'Soltar aquí' : label}
        </Typography>
      </Stack>
      {/* height:'1px' explicito (no `1` numerico) -- sx interpreta un numero
          <=1 en propiedades de tamaño como PORCENTAJE (sizingTransform de
          MUI), no como pixeles: con `height:1` esta linea se estiraba a
          100% de la fila del grid (bug real detectado en la primera
          verificacion visual, empujaba las posiciones fuera de la caja). */}
      <Box sx={{ height: '1px', bgcolor: alpha(color, 0.25), mb: 0.85 }} />
      {/* flexWrap (2026-08-28, a peticion explicita del usuario, Parte 14):
          las 2 posiciones se centran en una sola fila -- si el bloque se
          angostara demasiado (tablet), igual se reparten solas sin dejar de
          ser UN SOLO contenedor, nunca cards independientes. justifyContent
          'center' (2026-08-28, segunda ronda -- "distribuir visualmente los
          DOS puestos de forma limpia, equilibrada y centrada", "no quiero
          cuatro huecos enormes simulando cuatro personas"): con solo 2
          nodos angostos (maxWidth 140), dejarlos pegados a la izquierda del
          bloque ancho se veia desbalanceado -- centrados se ve como una
          franja limpia, no como una card a medio llenar. */}
      <Stack
        direction="row"
        flexWrap="wrap"
        justifyContent="center"
        sx={{ rowGap: 0.75, columnGap: 1.5 }}
      >
        {stations.map((w, i) => (
          <ConveyorNode
            key={w.id}
            index={i + 1}
            station={w}
            onOpen={() => onOpen('CONVEYOR_PRINCIPAL')}
          />
        ))}
      </Stack>
    </Box>
  )
}

/* Posicion/nodo compacto (Partes 4-7 del pedido: "NO quiero cuatro cards
   independientes enormes" -- avatar+nombre+rol+estado en un nodo angosto,
   nunca una BigZone). Reusa EmployeeAvatar (mismo componente de iniciales/
   color estable/dashed-si-vacante que ya usan las tarjetas de estacion de
   Accesorios/Insumos/Paletizado, Parte 16: nunca se inventa un nombre) y
   getPersonnelRank(station.role) -- exactamente la misma fuente de rango que
   usa LineStationCard.jsx para el resto de areas LINE_LIKE, sin logica de
   rango paralela. */
function ConveyorNode({ index, station, onOpen }) {
  const occupant = station.occupants[0]?.employee || null
  const rank = occupant ? getPersonnelRank(station.role) : null
  const nodeColor = occupant ? '#10B981' : '#F59E0B'
  return (
    <Stack
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      alignItems="center"
      spacing={0.15}
      sx={{
        flex: '1 1 84px',
        minWidth: 76,
        maxWidth: 140,
        py: 0.5,
        px: 0.5,
        borderRadius: 1.5,
        cursor: 'pointer',
        border: '1px dashed',
        borderColor: alpha(nodeColor, 0.4),
        '&:hover': { bgcolor: (t) => alpha(nodeColor, t.palette.mode === 'dark' ? 0.14 : 0.07) },
      }}
    >
      <Typography sx={{ fontSize: 9, fontWeight: 800, color: 'text.disabled', lineHeight: 1 }}>
        {index}
      </Typography>
      <EmployeeAvatar employee={occupant} size={32} dashed={!occupant} />
      <Typography
        sx={{ fontSize: 10, fontWeight: 700, textAlign: 'center', lineHeight: 1.15, mt: 0.15 }}
        noWrap
      >
        {occupant ? occupant.name : 'Vacante'}
      </Typography>
      {rank && (
        <Typography
          sx={{ fontSize: 8.5, color: 'text.secondary', textAlign: 'center', lineHeight: 1.1 }}
          noWrap
        >
          {rank.label}
        </Typography>
      )}
      <Typography sx={{ fontSize: 8, fontWeight: 800, color: nodeColor, letterSpacing: 0.3 }}>
        {occupant ? 'OCUPADA' : 'DISPONIBLE'}
      </Typography>
    </Stack>
  )
}

function BigZone({ areaId, gridArea, title, onOpen, readOnly, children }) {
  const wc = workCenterById(areaId)
  const staffing = getAreaStaffing(areaId)
  const status = statusFor(staffing.real, staffing.ideal)
  const color = status ? STATUS_META[status].color : '#94A3B8'
  const label =
    staffing.ideal != null
      ? `${staffing.real} / ${staffing.ideal}`
      : `${staffing.real} persona${staffing.real === 1 ? '' : 's'}`
  const { isOver, dropProps } = useEmployeeDropTarget(readOnly ? null : areaId)

  return (
    <Box
      {...(readOnly ? {} : dropProps)}
      onClick={() => onOpen(areaId)}
      sx={{
        gridArea,
        borderRadius: 2,
        p: 1.25,
        cursor: 'pointer',
        userSelect: 'none',
        border: '1px solid',
        borderColor: isOver ? '#3B82F6' : alpha(color, 0.35),
        borderTop: `3px solid ${color}`,
        bgcolor: isOver
          ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08)
          : (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
        overflow: 'hidden',
        transition: 'box-shadow .15s ease, background-color .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" flexWrap="wrap">
        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{title || wc?.name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          {isOver ? 'Soltar aquí' : label}
        </Typography>
      </Stack>
      {status && (
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color }}>
          {statusText(status, staffing)}
        </Typography>
      )}
      {/* minHeight:0 (2026-08-25, correccion definitiva): sin esto, este
          hijo flex nunca se encoge por debajo de su contenido -- el
          overflow:auto de arriba quedaba sin efecto y el personal que no
          cabia se recortaba en silencio (visible en desktop grande, pero
          mucho mas facil de disparar en tablet con menos alto disponible). */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</Box>
    </Box>
  )
}

/* LINEA1 se dibuja aparte (HorizontalLineBar, acostada junto a WC LINEA 0 --
   a peticion del usuario 2026-08-24) pero sigue sumando en el total de este
   bloque: sigue siendo parte real de "WC Líneas de producción (FFT)", solo
   cambia donde se dibuja su columna. */
const FFT_COLUMN_LINE_IDS = FFT_LINE_IDS.filter((id) => id !== 'LINEA1')

function FftBlock({ onOpen, onOpenSummary, readOnly }) {
  const totalReal = FFT_LINE_IDS.reduce((sum, id) => sum + getAreaHeadcount(id), 0)
  const totalIdeal = FFT_LINE_IDS.reduce(
    (sum, id) => sum + (workCenterById(id)?.idealHeadcount || 0),
    0,
  )
  return (
    <Box
      sx={{
        gridArea: 'fft',
        borderRadius: 2,
        p: 1.25,
        border: '1px solid',
        borderColor: 'divider',
        borderTop: '3px solid #3B82F6',
        bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        onClick={() => onOpenSummary('FFT_ALL')}
        sx={{ cursor: 'pointer' }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>
          WC Líneas de producción (FFT)
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          {totalReal} / {totalIdeal}
        </Typography>
      </Stack>
      {/* minHeight:0 (2026-08-25, correccion definitiva, mismo motivo que
          BigZone): sin esto la fila nunca se encogia por debajo de sus
          columnas y FftBlock (overflow:hidden) recortaba el personal
          sobrante en silencio. */}
      <Box sx={{ display: 'flex', gap: 0.6, flex: 1, minHeight: 0 }}>
        {FFT_COLUMN_LINE_IDS.map((id) => (
          <LineColumn key={id} lineId={id} onOpen={onOpen} readOnly={readOnly} />
        ))}
      </Box>
    </Box>
  )
}

/* Barra horizontal ("acostada") -- usada para LINEA1 y WC LINEA 0
   (PROYECTO), apiladas en el espacio que dejó libre la caja de
   Paletizado de arriba a la izquierda (a petición del usuario
   2026-08-24). Mismo lenguaje visual que BigZone, solo horizontal. */
function HorizontalLineBar({ lineId, title, onOpen, readOnly }) {
  const wc = workCenterById(lineId)
  const staffing = getAreaStaffing(lineId)
  const status = statusFor(staffing.real, staffing.ideal) || 'SIN_PERSONAL'
  const color = STATUS_META[status].color
  const label =
    staffing.ideal != null
      ? `${staffing.real} / ${staffing.ideal}`
      : `${staffing.real} persona${staffing.real === 1 ? '' : 's'}`
  const pct = staffing.ideal ? Math.min(1, staffing.real / staffing.ideal) : 0
  const { isOver, dropProps } = useEmployeeDropTarget(readOnly ? null : lineId)
  return (
    <Box
      {...(readOnly ? {} : dropProps)}
      onClick={() => onOpen(lineId)}
      sx={{
        flex: 1,
        borderRadius: 2,
        p: 1,
        cursor: 'pointer',
        userSelect: 'none',
        border: '1px solid',
        borderColor: isOver ? '#3B82F6' : alpha(color, 0.35),
        borderTop: `3px solid ${color}`,
        bgcolor: isOver
          ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08)
          : (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.5,
        minHeight: 0,
        transition: 'box-shadow .15s ease, background-color .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography sx={{ fontWeight: 800, fontSize: 12.5 }}>{title || wc?.name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
          {isOver ? 'Soltar aquí' : label}
        </Typography>
      </Stack>
      {status && (
        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color }}>
          {statusText(status, staffing)}
        </Typography>
      )}
      <Box
        sx={{
          width: '100%',
          height: 6,
          borderRadius: 999,
          bgcolor: alpha(color, 0.18),
          overflow: 'hidden',
        }}
      >
        <Box sx={{ width: `${pct * 100}%`, height: '100%', bgcolor: color, borderRadius: 999 }} />
      </Box>
      {/* Nombres reales (2026-08-25, a peticion explicita del usuario): si hay
          personal, debe verse su nombre igual que en WC Accesorios, no solo la
          barra de avance. */}
      <Box sx={{ mt: 0.5, maxHeight: 70, overflow: 'auto' }}>
        <PersonList areaId={lineId} columns={2} readOnly={readOnly} />
      </Box>
    </Box>
  )
}

function LineColumn({ lineId, onOpen, readOnly }) {
  const wc = workCenterById(lineId)
  const staffing = getAreaStaffing(lineId)
  const status = statusFor(staffing.real, staffing.ideal) || 'SIN_PERSONAL'
  const color = STATUS_META[status].color
  const pct = staffing.ideal ? Math.min(1, staffing.real / staffing.ideal) : 0
  const { isOver, dropProps } = useEmployeeDropTarget(readOnly ? null : lineId)
  return (
    <Box
      {...(readOnly ? {} : dropProps)}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(lineId)
      }}
      sx={{
        flex: '1 1 0',
        minWidth: 46,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        py: 0.75,
        px: 0.4,
        borderRadius: 1.5,
        minHeight: 0,
        height: '100%',
        border: '1px solid',
        borderColor: isOver ? '#3B82F6' : alpha(color, 0.3),
        bgcolor: isOver
          ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08)
          : (t) => alpha(color, t.palette.mode === 'dark' ? 0.1 : 0.06),
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      {/* Prefijo WC completo (2026-08-27, corrigiendo un bug real: este
          Typography le quitaba "WC " al nombre real de wc.name, dejando
          "LINEA 2" en vez de "WC LINEA 2" -- el titulo del bloque FFT ya
          decia "WC Líneas de producción" pero las tarjetas internas no).
          fontSize/letterSpacing bajan un poco para que "WC LINEA 10" siga
          cabiendo en columnas angostas sin ensanchar la card; si de plano
          no cabe, el Typography ya envuelve a 2 líneas solo (sin noWrap),
          nunca trunca. */}
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: -0.2,
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        {isOver ? 'Soltar' : wc?.name || lineId}
      </Typography>
      <Box
        sx={{
          width: 8,
          height: 36,
          borderRadius: 4,
          bgcolor: alpha(color, 0.18),
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
          my: 0.5,
        }}
      >
        <Box sx={{ width: '100%', height: `${pct * 100}%`, bgcolor: color, borderRadius: 4 }} />
      </Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
        {staffing.real}/{staffing.ideal}
      </Typography>
      {/* Nombres reales (2026-08-25, a peticion explicita del usuario): si hay
          personal, debe verse su nombre igual que en WC Accesorios, no solo la
          barra de avance. */}
      <Box sx={{ width: '100%', flex: 1, minHeight: 0, overflow: 'auto', mt: 0.4 }}>
        <PersonList areaId={lineId} readOnly={readOnly} />
      </Box>
    </Box>
  )
}

function HighValueGrid({ areaId }) {
  const staffing = getAreaStaffing(areaId)
  const status = statusFor(staffing.real, staffing.ideal) || 'SIN_PERSONAL'
  const color = STATUS_META[status].color
  const total = staffing.ideal || 16
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, flex: 1 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box
          key={i}
          sx={{
            borderRadius: 0.75,
            minHeight: 16,
            bgcolor: i < staffing.real ? alpha(color, 0.55) : alpha(color, 0.08),
            border: '1px solid',
            borderColor: alpha(color, 0.25),
          }}
        />
      ))}
    </Box>
  )
}

function MixtosDecoration() {
  return (
    <Box sx={{ display: 'flex', gap: 1, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1].map((i) => (
        <Box
          key={i}
          sx={{
            width: 10,
            height: '80%',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
          }}
        />
      ))}
    </Box>
  )
}

/* WC Insumos y Suministro de Material (2026-08-26, "Reestructuracion
   operativa FFT", a peticion explicita del usuario) -- fusion visual de
   PNP/POC/PEN (decorativa, sin WORK_CENTER propio) + Box Prep + Insumos +
   Suministro de material en UNA sola caja grande, ocupando el espacio que
   antes tenian las 4 celdas separadas (ver grid gridTemplateAreas arriba).
   Sigue siendo group-aware via operationalGroupMembers('INSUMOS')
   (catalog.js/AREA_DETAIL_GROUPS) -- exactamente los mismos numeros que
   veras al abrir el detalle completo (OperationalAreaDetail.jsx), nunca
   una segunda fuente. INSUMOS es el id canonico al que cae cualquier
   arrastre/click sobre la caja fusionada. */
function InsumosSuministroZone({ gridArea, onOpen, onOpenSummary, readOnly }) {
  const memberIds = operationalGroupMembers('INSUMOS')
  const staffing = getGroupAreaStaffing(memberIds)
  const people = getGroupPeople(memberIds)
  const status = statusFor(staffing.real, staffing.ideal)
  const { isOver, dropProps } = useEmployeeDropTarget(readOnly ? null : 'INSUMOS')
  const color = status ? STATUS_META[status].color : '#94A3B8'
  const label =
    staffing.ideal != null
      ? `${staffing.real} / ${staffing.ideal}`
      : `${staffing.real} persona${staffing.real === 1 ? '' : 's'}`
  return (
    <Box
      {...(readOnly ? {} : dropProps)}
      onClick={() => (readOnly ? onOpenSummary('INSUMOS_SUMINISTRO_ALL') : onOpen('INSUMOS'))}
      sx={{
        gridArea,
        borderRadius: 2,
        p: 1.25,
        cursor: 'pointer',
        userSelect: 'none',
        border: '1px solid',
        borderColor: isOver ? '#3B82F6' : alpha(color, 0.35),
        borderTop: `3px solid ${color}`,
        bgcolor: isOver
          ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08)
          : (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex',
        flexDirection: 'column',
        gap: 0.6,
        overflow: 'hidden',
        transition: 'box-shadow .15s ease, background-color .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" flexWrap="wrap">
        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
          WC Insumos y Suministro de Material
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          {isOver ? 'Soltar aquí' : label}
        </Typography>
      </Stack>
      {status && (
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color }}>
          {statusText(status, staffing)}
        </Typography>
      )}
      <Typography sx={{ fontSize: 9, color: 'text.secondary', fontStyle: 'italic' }}>
        PNP / POC / PEN · Box Prep · Suministro de material
      </Typography>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PersonList people={people} columns={2} readOnly={readOnly} />
      </Box>
    </Box>
  )
}

/* readOnly=false (Layout 2D, 2026-08-25): cada persona listada se vuelve
   arrastrable (DraggablePersonChip, mismo componente generico ya usado por
   WorkAreaMap/AvailablePersonnelTray) -- sin esto no habia ninguna fuente
   real de donde arrastrar dentro de este plano, solo destinos. En readOnly
   (Dashboard) sigue exactamente igual que siempre, texto plano sin arrastre. */
function PersonList({ areaId, columns = 1, people: peopleProp, readOnly }) {
  const people = peopleProp || getPeopleByArea()[areaId] || []
  if (people.length === 0) {
    return (
      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>
        Sin personal asignado
      </Typography>
    )
  }
  return (
    <Box
      sx={
        columns > 1
          ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 0.4 }
          : { display: 'flex', flexDirection: 'column', gap: 0.4 }
      }
    >
      {people.map((p) => {
        const row = (
          <Tooltip title={p.name} enterTouchDelay={0} leaveTouchDelay={2500} disableInteractive>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PersonIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, lineHeight: 1.25 }} noWrap>
                {p.name}
              </Typography>
            </Stack>
          </Tooltip>
        )
        if (readOnly) return <Box key={p.id}>{row}</Box>
        return (
          <DraggablePersonChip key={p.id} employeeId={p.id} sx={{ display: 'block' }}>
            {row}
          </DraggablePersonChip>
        )
      })}
    </Box>
  )
}

function SupportCard({ areaId, onOpen, readOnly }) {
  const wc = workCenterById(areaId)
  const staffing = getAreaStaffing(areaId)
  const status = statusFor(staffing.real, staffing.ideal)
  const color = status ? STATUS_META[status].color : '#94A3B8'
  const label =
    staffing.ideal != null ? `${staffing.real}/${staffing.ideal}` : `${staffing.real} pers.`
  const { isOver, dropProps } = useEmployeeDropTarget(readOnly ? null : areaId)

  return (
    <Box
      {...(readOnly ? {} : dropProps)}
      onClick={() => onOpen(areaId)}
      sx={{
        minWidth: 168,
        flex: '1 1 168px',
        maxWidth: 230,
        p: 1.25,
        borderRadius: 2,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: isOver ? '#3B82F6' : alpha(color, 0.35),
        borderLeft: `3px solid ${color}`,
        bgcolor: isOver
          ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08)
          : (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        transition: 'box-shadow .15s ease, background-color .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.2)}` },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography sx={{ fontWeight: 800, fontSize: 12 }}>{wc?.name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
          {isOver ? 'Soltar aquí' : label}
        </Typography>
      </Stack>
      {status && (
        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color, mt: 0.25 }}>
          {STATUS_META[status].label}
        </Typography>
      )}
      <Box sx={{ mt: 0.5, maxHeight: 90, overflow: 'auto' }}>
        <PersonList areaId={areaId} readOnly={readOnly} />
      </Box>
    </Box>
  )
}

function DetailDialog({ areaId, onClose }) {
  const open = !!areaId
  let title = ''
  let staffing = null
  let people = []

  if (areaId === 'FFT_ALL') {
    title = 'WC Líneas de producción (FFT)'
    const real = FFT_LINE_IDS.reduce((sum, id) => sum + getAreaHeadcount(id), 0)
    const ideal = FFT_LINE_IDS.reduce(
      (sum, id) => sum + (workCenterById(id)?.idealHeadcount || 0),
      0,
    )
    staffing = { real, ideal }
    people = getFftPeopleWithLine()
  } else if (areaId === 'INSUMOS_SUMINISTRO_ALL') {
    const memberIds = operationalGroupMembers('INSUMOS')
    title = workCenterById('INSUMOS')?.name || 'WC Insumos y Suministro de Material'
    staffing = getGroupAreaStaffing(memberIds)
    people = getGroupPeople(memberIds)
  } else if (areaId) {
    title = workCenterById(areaId)?.name || areaId
    staffing = getAreaStaffing(areaId)
    people = getPeopleByArea()[areaId] || []
  }

  const status = staffing ? statusFor(staffing.real, staffing.ideal) : null
  const meta = status ? STATUS_META[status] : null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {staffing && (
        <>
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 800,
            }}
          >
            {title}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 20 }}>
                {staffing.ideal != null
                  ? `${staffing.real} / ${staffing.ideal}`
                  : `${staffing.real} personas`}
              </Typography>
              {meta && (
                <Chip
                  size="small"
                  label={meta.label}
                  sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700 }}
                />
              )}
            </Stack>
            {people.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                Sin personal asignado.
              </Typography>
            ) : (
              <Stack spacing={0.75} sx={{ maxHeight: 320, overflow: 'auto' }}>
                {people.map((p) => (
                  <Stack key={p.id} direction="row" spacing={0.75} alignItems="center">
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: 13 }}>
                      {p.name}
                      {p.lineName ? ` · ${p.lineName}` : ''}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  )
}
