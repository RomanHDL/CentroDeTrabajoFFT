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
import Alert from '@mui/material/Alert'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import FullscreenIcon from '@mui/icons-material/Fullscreen'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import PersonIcon from '@mui/icons-material/Person'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { alpha } from '@mui/material/styles'
import { usePersonnelVersion } from '../data/personnel/usePersonnelVersion'
import { workCenterById, WORK_CENTERS } from '../data/production/catalog'
import {
  getAreaHeadcount, getAreaStaffing, getPeopleByArea, hasAnyPersonnelToday,
  getStaffingTotals, getFftPeopleWithLine,
} from '../data/production/personnelByArea'
import { FFT_LINE_IDS, SUPPORT_CARD_AREA_IDS, REFERENCE_ONLY_ZONES } from '../data/production/floorPlanZones'

/* ─────────────────────────────────────────────
   "Área operando" -- plano 2D completo (rediseño 2026-08-24 a partir
   del mockup que el usuario compartió). Vivía solo en Layout2DPage
   (ruta /layout-2d, solo ADMINISTRADOR); a petición explícita del
   usuario (2026-08-24) se extrajo aquí como componente compartido
   para poder mostrar EXACTAMENTE el mismo diseño también en el
   Dashboard (DashboardWorkAreaSection) -- una sola fuente de verdad
   visual, nunca dos planos que puedan desincronizarse. Ambas paginas
   solo montan <OperatingFloorPlan /> dentro de su propio contenedor
   (Layout2DPage le pone su Paper de pagina completa; Dashboard ya
   trae su propio Paper "Layout del área de trabajo" por fuera).

   Decisiones explícitas del usuario (2026-08-24):
   - Los dos conveyors (Principal/Secundario) son SOLO decoración,
     sin conteo -- prohibido crear cualquier card "CT Conveyor".
   - "CT Sellado" no aparece en este módulo bajo ninguna forma.
   Ver floorPlanZones.js para el detalle completo de estas exclusiones
   y los ajustes de fusion/intercambio de cajas (Paletizado, Insumos+
   Suministro, Midea+Mixtos, Accesorios).

   Los conteos en vivo salen de las mismas funciones que ya usan
   AreaSummaryStrip/WorkAreaMap (personnelByArea.js) -- ninguna fuente
   de datos paralela; usePersonnelVersion() cubre tanto cambios
   locales como el sondeo del backend real (Fase 2) sin plomería
   extra. */

const STATUS_META = {
  COMPLETA: { color: '#10B981', label: 'Completa' },
  PARCIAL: { color: '#3B82F6', label: 'Parcial' },
  FALTA: { color: '#EF4444', label: 'Falta personal' },
  SIN_PERSONAL: { color: '#94A3B8', label: 'Sin personal' },
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

const SHOWN_AREA_IDS = WORK_CENTERS.filter((w) => w.id !== 'CONVEYOR' && w.id !== 'SELLADO').map((w) => w.id)

export default function OperatingFloorPlan() {
  usePersonnelVersion()
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [detailId, setDetailId] = useState(null)
  const planRef = useRef(null)

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else planRef.current?.requestFullscreen?.()
  }

  const operating = hasAnyPersonnelToday()
  const totals = getStaffingTotals()
  const totalPeople = SHOWN_AREA_IDS.reduce((sum, id) => sum + getAreaHeadcount(id), 0)

  return (
    <Box sx={{ p: 2.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: operating ? '#10B981' : '#94A3B8' }} />
          <Typography sx={{ fontWeight: 800, fontSize: 20 }}>Área operando</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          <LegendChip status="COMPLETA" />
          <LegendChip status="FALTA" />
          <LegendChip status="PARCIAL" />
          <LegendChip status="SIN_PERSONAL" />
          <Chip
            size="small" icon={<InfoOutlinedIcon fontSize="small" />} label="Referencias"
            onClick={() => setShowLegend((v) => !v)}
            sx={{ fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}
          />
          <Chip size="small" label={`${totalPeople} personas`} sx={{ fontWeight: 700, fontSize: 11.5 }} />
          <Tooltip title="Ocupación (actual / requerida)">
            <Chip size="small" label={`${totals.realTotal} / ${totals.idealTotal}`} color="primary" variant="outlined" sx={{ fontWeight: 800, fontSize: 11.5 }} />
          </Tooltip>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        No hay forma confirmada de mapear cada bahía física a un número de línea desde la imagen de referencia — las
        10 líneas se muestran en el orden del catálogo (Línea 1..10), no en una correspondencia física verificada.
      </Alert>

      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
        <Button
          size="small" startIcon={<CenterFocusStrongIcon fontSize="small" />} onClick={() => setZoom(1)}
          sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary', minHeight: 36 }}
        >
          Ajustar vista
        </Button>
        <Tooltip title="Alejar">
          <IconButton sx={{ width: 36, height: 36 }} onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'center' }}>{Math.round(zoom * 100)}%</Typography>
        <Tooltip title="Acercar">
          <IconButton sx={{ width: 36, height: 36 }} onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
          <IconButton sx={{ width: 36, height: 36 }} onClick={toggleFullscreen}>
            {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        ref={planRef}
        sx={{
          bgcolor: 'background.paper', overflow: 'auto',
          ...(isFullscreen ? { p: 2.5, height: '100vh' } : {}),
        }}
      >
        <Box sx={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform .15s ease', width: `${100 / zoom}%` }}>
          <FloorPlan onOpen={setDetailId} />

          {showLegend && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 200 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 11, mb: 0.75 }}>LEYENDA</Typography>
                <Stack spacing={0.4}>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <Stack key={key} direction="row" spacing={0.75} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color }} />
                      <Typography sx={{ fontSize: 10.5 }}>{meta.label}</Typography>
                    </Stack>
                  ))}
                  <Typography sx={{ fontSize: 9.5, color: 'text.secondary', mt: 0.5 }}>
                    Conveyor Principal/Secundario: solo referencia visual, sin personal asociado.
                  </Typography>
                </Stack>
              </Paper>
            </Box>
          )}
        </Box>
      </Box>

      <DetailDialog areaId={detailId} onClose={() => setDetailId(null)} />
    </Box>
  )
}

function LegendChip({ status }) {
  const meta = STATUS_META[status]
  return (
    <Chip
      size="small"
      icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color, ml: '8px !important' }} />}
      label={meta.label}
      sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: alpha(meta.color, 0.1) }}
    />
  )
}

function FloorPlan({ onOpen }) {
  return (
    <Box sx={{ minWidth: 1180 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <ConveyorBar label="CONVEYOR PRINCIPAL" />
        <ConveyorBar label="CONVEYOR SECUNDARIO" />
      </Stack>

      <Box
        sx={{
          display: 'grid', gap: 1,
          gridTemplateColumns: 'minmax(90px,0.7fr) minmax(90px,0.7fr) repeat(10, minmax(56px,1fr)) minmax(150px,1.1fr) minmax(108px,0.8fr) minmax(190px,1.3fr)',
          gridTemplateRows: '250px 160px',
          gridTemplateAreas: `
            "paletizado paletizado fft fft fft fft fft fft fft fft fft fft highvalue highvalue palletizing"
            "pnp boxprep stock stock accessories accessories accessories accessories accessories accessories accessories accessories accessories accessories palletizing"
          `,
        }}
      >
        <Box sx={{ gridArea: 'paletizado', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <HorizontalLineBar lineId="LINEA1" onOpen={onOpen} />
          <HorizontalLineBar lineId="PROYECTO" title="CT LINEA 0" onOpen={onOpen} />
        </Box>

        <FftBlock onOpen={onOpen} />

        <BigZone areaId="HIGH_VALUE" gridArea="highvalue" title="CT Midea / High Value" onOpen={onOpen}>
          <Stack direction="row" spacing={1} sx={{ height: '100%' }}>
            <Box sx={{ flex: 1.4, minWidth: 0 }}>
              <HighValueGrid areaId="HIGH_VALUE" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5, borderLeft: '1px dashed', borderColor: 'divider', pl: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 9.5, textAlign: 'center', color: 'text.secondary' }}>Productos Mixtos</Typography>
              <MixtosDecoration />
            </Box>
          </Stack>
        </BigZone>

        <BigZone areaId="PALETIZADO" gridArea="palletizing" title="CT Paletizado (Palletizing)" onOpen={onOpen}>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, m: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', px: 1 }}>
              Zona de paletizado — mismo dato que "CT Paletizado", espacio físico grande
            </Typography>
          </Box>
        </BigZone>

        {REFERENCE_ONLY_ZONES.map((z) => (
          <ReferenceZone key={z.key} gridArea={z.key} label={z.label} icon={z.key === 'boxprep' ? <Inventory2Icon sx={{ fontSize: 18 }} /> : undefined} />
        ))}

        <InsumosSuministroZone gridArea="stock" onOpen={onOpen} />

        <BigZone areaId="ACCESORIOS" gridArea="accessories" title="CT Accesorios" onOpen={onOpen}>
          <PersonList areaId="ACCESORIOS" columns={2} />
        </BigZone>
      </Box>

      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {SUPPORT_CARD_AREA_IDS.map((id) => <SupportCard key={id} areaId={id} onOpen={onOpen} />)}
        </Stack>
      </Box>
    </Box>
  )
}

function ConveyorBar({ label }) {
  return (
    <Box sx={{
      flex: 1, height: 40, borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: 'text.secondary' }}>{label}</Typography>
    </Box>
  )
}

function ReferenceZone({ gridArea, label, icon }) {
  return (
    <Box sx={{
      gridArea, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
      color: 'text.disabled', p: 0.75,
    }}>
      {icon}
      <Typography sx={{ fontSize: 10, fontWeight: 700, textAlign: 'center' }}>{label}</Typography>
    </Box>
  )
}

function BigZone({ areaId, gridArea, title, onOpen, children }) {
  const wc = workCenterById(areaId)
  const staffing = getAreaStaffing(areaId)
  const status = statusFor(staffing.real, staffing.ideal)
  const color = status ? STATUS_META[status].color : '#94A3B8'
  const label = staffing.ideal != null
    ? `${staffing.real} / ${staffing.ideal}`
    : `${staffing.real} persona${staffing.real === 1 ? '' : 's'}`

  return (
    <Box
      onClick={() => onOpen(areaId)}
      sx={{
        gridArea, borderRadius: 2, p: 1.25, cursor: 'pointer', userSelect: 'none',
        border: '1px solid', borderColor: alpha(color, 0.35), borderTop: `3px solid ${color}`,
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex', flexDirection: 'column', gap: 0.6, overflow: 'hidden',
        transition: 'box-shadow .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" flexWrap="wrap">
        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{title || wc?.name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{label}</Typography>
      </Stack>
      {status && <Typography sx={{ fontSize: 10.5, fontWeight: 700, color }}>{statusText(status, staffing)}</Typography>}
      <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
    </Box>
  )
}

/* LINEA1 se dibuja aparte (HorizontalLineBar, acostada junto a CT LINEA 0 --
   a peticion del usuario 2026-08-24) pero sigue sumando en el total de este
   bloque: sigue siendo parte real de "CT Líneas de producción (FFT)", solo
   cambia donde se dibuja su columna. */
const FFT_COLUMN_LINE_IDS = FFT_LINE_IDS.filter((id) => id !== 'LINEA1')

function FftBlock({ onOpen }) {
  const totalReal = FFT_LINE_IDS.reduce((sum, id) => sum + getAreaHeadcount(id), 0)
  const totalIdeal = FFT_LINE_IDS.reduce((sum, id) => sum + (workCenterById(id)?.idealHeadcount || 0), 0)
  return (
    <Box sx={{
      gridArea: 'fft', borderRadius: 2, p: 1.25, border: '1px solid', borderColor: 'divider',
      borderTop: '3px solid #3B82F6', bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.05 : 0.035),
      display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden',
    }}>
      <Stack
        direction="row" alignItems="baseline" justifyContent="space-between"
        onClick={() => onOpen('FFT_ALL')} sx={{ cursor: 'pointer' }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>CT Líneas de producción (FFT)</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{totalReal} / {totalIdeal}</Typography>
      </Stack>
      <Box sx={{ display: 'flex', gap: 0.6, flex: 1 }}>
        {FFT_COLUMN_LINE_IDS.map((id) => <LineColumn key={id} lineId={id} onOpen={onOpen} />)}
      </Box>
    </Box>
  )
}

/* Barra horizontal ("acostada") -- usada para LINEA1 y CT LINEA 0
   (PROYECTO), apiladas en el espacio que dejó libre la caja de
   Paletizado de arriba a la izquierda (a petición del usuario
   2026-08-24). Mismo lenguaje visual que BigZone, solo horizontal. */
function HorizontalLineBar({ lineId, title, onOpen }) {
  const wc = workCenterById(lineId)
  const staffing = getAreaStaffing(lineId)
  const status = statusFor(staffing.real, staffing.ideal) || 'SIN_PERSONAL'
  const color = STATUS_META[status].color
  const label = staffing.ideal != null
    ? `${staffing.real} / ${staffing.ideal}`
    : `${staffing.real} persona${staffing.real === 1 ? '' : 's'}`
  const pct = staffing.ideal ? Math.min(1, staffing.real / staffing.ideal) : 0
  return (
    <Box
      onClick={() => onOpen(lineId)}
      sx={{
        flex: 1, borderRadius: 2, p: 1, cursor: 'pointer', userSelect: 'none',
        border: '1px solid', borderColor: alpha(color, 0.35), borderTop: `3px solid ${color}`,
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.5, minHeight: 0,
        transition: 'box-shadow .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography sx={{ fontWeight: 800, fontSize: 12.5 }}>{title || wc?.name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>{label}</Typography>
      </Stack>
      {status && <Typography sx={{ fontSize: 9.5, fontWeight: 700, color }}>{statusText(status, staffing)}</Typography>}
      <Box sx={{ width: '100%', height: 6, borderRadius: 999, bgcolor: alpha(color, 0.18), overflow: 'hidden' }}>
        <Box sx={{ width: `${pct * 100}%`, height: '100%', bgcolor: color, borderRadius: 999 }} />
      </Box>
    </Box>
  )
}

function LineColumn({ lineId, onOpen }) {
  const wc = workCenterById(lineId)
  const staffing = getAreaStaffing(lineId)
  const status = statusFor(staffing.real, staffing.ideal) || 'SIN_PERSONAL'
  const color = STATUS_META[status].color
  const pct = staffing.ideal ? Math.min(1, staffing.real / staffing.ideal) : 0
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onOpen(lineId) }}
      sx={{
        flex: '1 1 0', minWidth: 46, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', py: 0.75, borderRadius: 1.5,
        border: '1px solid', borderColor: alpha(color, 0.3),
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.1 : 0.06),
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Typography sx={{ fontSize: 9.5, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
        {(wc?.name || lineId).replace('CT ', '')}
      </Typography>
      <Box sx={{ width: 8, height: 64, borderRadius: 4, bgcolor: alpha(color, 0.18), display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <Box sx={{ width: '100%', height: `${pct * 100}%`, bgcolor: color, borderRadius: 4 }} />
      </Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{staffing.real}/{staffing.ideal}</Typography>
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
            borderRadius: 0.75, minHeight: 16,
            bgcolor: i < staffing.real ? alpha(color, 0.55) : alpha(color, 0.08),
            border: '1px solid', borderColor: alpha(color, 0.25),
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
        <Box key={i} sx={{ width: 10, height: '80%', borderRadius: 1, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }} />
      ))}
    </Box>
  )
}

/* CT Insumos + CT Suministro de material fusionados en una sola caja visual
   (a petición explícita del usuario 2026-08-24) -- siguen siendo dos áreas
   reales separadas en el catálogo (INSUMOS/SUMINISTRO_MATERIAL, ninguna
   tiene plantilla oficial), esto solo combina cómo se dibujan aquí. */
function InsumosSuministroZone({ gridArea, onOpen }) {
  const peopleInsumos = getPeopleByArea()['INSUMOS'] || []
  const peopleSuministro = getPeopleByArea()['SUMINISTRO_MATERIAL'] || []
  const real = peopleInsumos.length + peopleSuministro.length
  const color = real > 0 ? '#3B82F6' : '#94A3B8'
  return (
    <Box
      onClick={() => onOpen('INSUMOS_SUMINISTRO_ALL')}
      sx={{
        gridArea, borderRadius: 2, p: 1.25, cursor: 'pointer', userSelect: 'none',
        border: '1px solid', borderColor: alpha(color, 0.35), borderTop: `3px solid ${color}`,
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        display: 'flex', flexDirection: 'column', gap: 0.6, overflow: 'hidden',
        transition: 'box-shadow .15s ease',
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.25)}` },
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" flexWrap="wrap">
        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>CT Insumos y Suministro de material</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{real} persona{real === 1 ? '' : 's'}</Typography>
      </Stack>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <PersonList people={[...peopleInsumos, ...peopleSuministro]} columns={2} />
      </Box>
    </Box>
  )
}

function PersonList({ areaId, columns = 1, people: peopleProp }) {
  const people = peopleProp || getPeopleByArea()[areaId] || []
  if (people.length === 0) {
    return <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>Sin personal asignado</Typography>
  }
  return (
    <Box sx={columns > 1 ? { display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 0.4 } : { display: 'flex', flexDirection: 'column', gap: 0.4 }}>
      {people.map((p) => (
        <Stack key={p.id} direction="row" spacing={0.5} alignItems="center">
          <PersonIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11.5, lineHeight: 1.25 }} noWrap>{p.name}</Typography>
        </Stack>
      ))}
    </Box>
  )
}

function SupportCard({ areaId, onOpen }) {
  const wc = workCenterById(areaId)
  const staffing = getAreaStaffing(areaId)
  const status = statusFor(staffing.real, staffing.ideal)
  const color = status ? STATUS_META[status].color : '#94A3B8'
  const label = staffing.ideal != null
    ? `${staffing.real}/${staffing.ideal}`
    : `${staffing.real} pers.`

  return (
    <Box
      onClick={() => onOpen(areaId)}
      sx={{
        minWidth: 168, flex: '1 1 168px', maxWidth: 230, p: 1.25, borderRadius: 2, cursor: 'pointer',
        border: '1px solid', borderColor: alpha(color, 0.35), borderLeft: `3px solid ${color}`,
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.05 : 0.035),
        '&:hover': { boxShadow: `0 0 0 2px ${alpha(color, 0.2)}` },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography sx={{ fontWeight: 800, fontSize: 12 }}>{wc?.name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{label}</Typography>
      </Stack>
      {status && <Typography sx={{ fontSize: 9.5, fontWeight: 700, color, mt: 0.25 }}>{STATUS_META[status].label}</Typography>}
      <Box sx={{ mt: 0.5, maxHeight: 90, overflow: 'auto' }}>
        <PersonList areaId={areaId} />
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
    title = 'CT Líneas de producción (FFT)'
    const real = FFT_LINE_IDS.reduce((sum, id) => sum + getAreaHeadcount(id), 0)
    const ideal = FFT_LINE_IDS.reduce((sum, id) => sum + (workCenterById(id)?.idealHeadcount || 0), 0)
    staffing = { real, ideal }
    people = getFftPeopleWithLine()
  } else if (areaId === 'INSUMOS_SUMINISTRO_ALL') {
    title = 'CT Insumos y Suministro de material'
    staffing = { real: getAreaHeadcount('INSUMOS') + getAreaHeadcount('SUMINISTRO_MATERIAL'), ideal: null }
    people = [...(getPeopleByArea()['INSUMOS'] || []), ...(getPeopleByArea()['SUMINISTRO_MATERIAL'] || [])]
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
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800 }}>
            {title}
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 20 }}>
                {staffing.ideal != null ? `${staffing.real} / ${staffing.ideal}` : `${staffing.real} personas`}
              </Typography>
              {meta && (
                <Chip size="small" label={meta.label} sx={{ bgcolor: alpha(meta.color, 0.15), color: meta.color, fontWeight: 700 }} />
              )}
            </Stack>
            {people.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Sin personal asignado.</Typography>
            ) : (
              <Stack spacing={0.75} sx={{ maxHeight: 320, overflow: 'auto' }}>
                {people.map((p) => (
                  <Stack key={p.id} direction="row" spacing={0.75} alignItems="center">
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography sx={{ fontSize: 13 }}>{p.name}{p.lineName ? ` · ${p.lineName}` : ''}</Typography>
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
