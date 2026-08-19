import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import PersonIcon from '@mui/icons-material/Person'
import { alpha } from '@mui/material/styles'
import { PHYSICAL_ZONES, FFT_LINE_IDS, COLOR_GROUPS, getAuxiliaryAreas, colorForArea } from '../data/production/layoutZones'
import { getAreaHeadcount, getPeopleByArea, hasAnyPersonnelToday, getAreaStaffing } from '../data/production/personnelByArea'
import { workCenterById } from '../data/production/catalog'
import { usePersonnelVersion } from '../data/personnel/usePersonnelVersion'
import { useEmployeeDropTarget } from '../ui/dnd'
import DraggablePersonChip from '../ui/DraggablePersonChip'
import EmployeeAvatar from '../pages/centro-trabajo/EmployeeAvatar'

/* ─────────────────────────────────────────────
   WorkAreaMap — interpretacion web del plano fisico real del area
   de trabajo. MISMO sistema visual en Dashboard y Centro de Trabajo
   (aprobado por el usuario): no hay dos disenos distintos, solo dos
   formas de reaccionar al click (Dashboard abre un Drawer rapido,
   Centro de Trabajo abre panel + detalle completo) que decide cada
   pagina via onSelect().

   Layout ajustado 2026-08-19 al pizarron real del piso (foto
   proporcionada por el usuario): Linea 1 y Linea de proyecto (CT1 y
   CT0) se dibujan como barras horizontales a la DERECHA del bloque
   de lineas verticales (no arriba); las lineas 2..10 van en orden
   DESCENDENTE de izquierda a derecha (L10..L2), igual que en el
   pizarron; Midea y High Value son el MISMO bloque fisico
   ("CT MIDEA/HV" — ver catalog.js, se fusionaron); se agregan
   Sellado, Insumos y Suministro de material como areas nuevas
   reales, todavia sin plantilla oficial ni personal identificado
   (nunca se inventa: si no hay dato, se muestra "Sin datos"). El
   Conveyor se dibuja abajo (no arriba), junto a Sellado, tal como
   aparece en el pizarron.

   NO es una copia al pixel del CAD real, es una aproximacion de
   posicion/proporcion pensada para pantalla. Nunca se inventan
   lineas/areas que no esten en el catalogo. Los tags de nombres
   dentro de Palletizing/Accessories/Proyecto son una MUESTRA de
   personal real (personnelByArea.js) y a la vez origen de arrastre
   (drag & drop); toda zona/linea/area valida es tambien destino de
   soltar.
   ───────────────────────────────────────────── */

const ZONE_COLORS = {
  PROYECTO: '#3B82F6',
  CONVEYOR: '#3B82F6',
  FFT: '#3B82F6',
  HIGHVALUE: '#F43F5E',
  SELLADO: '#F59E0B',
  INSUMOS: '#A855F7',
  SUMINISTRO: '#06B6D4',
  PALLETIZING: '#10B981',
  ACCESSORIES: '#EF4444',
}

const TAG_SAMPLE_LIMIT = 8

/* L10..L2 de izquierda a derecha (descendente), igual que el
   pizarron real — Linea 1 se dibuja aparte (ver HorizontalAreaBar). */
const VERTICAL_LINE_IDS = FFT_LINE_IDS.filter((id) => id !== 'LINEA1').slice().reverse()

function headcountForZone(zone) {
  return zone.areaIds.reduce((sum, id) => sum + getAreaHeadcount(id), 0)
}

/* Ideal sumado de una zona fisica (solo tiene sentido si TODAS sus
   areas tienen plantilla oficial — p. ej. FFT, donde las 10 lineas
   la tienen). Si a alguna le falta, no se muestra comparacion para
   no mezclar "sin plantilla" con un total parcial enganoso. */
function idealForZone(zone) {
  if (zone.areaIds.length === 0) return null
  const ideals = zone.areaIds.map((id) => workCenterById(id)?.idealHeadcount)
  if (ideals.some((v) => v == null)) return null
  return ideals.reduce((s, v) => s + v, 0)
}

/* Tono visual REAL vs IDEAL — un solo lugar para decidir colores,
   nunca pantalla completa en rojo: solo un chip/texto discreto. */
function staffingTone(real, ideal) {
  if (ideal == null) return null
  const complete = real >= ideal
  const missing = ideal - real
  return {
    complete,
    chipLabel: `${real} / ${ideal}`,
    chipColor: complete ? '#047857' : '#B91C1C',
    chipBg: complete ? '#10B98122' : '#EF444422',
    statusLabel: complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`,
    statusColor: complete ? '#10B981' : '#EF4444',
  }
}

export function describeZoneSelection(zone) {
  if (zone.areaIds.length === 0) return { type: 'empty', id: zone.id, label: zone.label }
  if (zone.areaIds.length === 1) return { type: 'area', id: zone.areaIds[0] }
  return { type: 'zoneGroup', id: zone.id, areaIds: zone.areaIds, label: zone.label }
}

function isZoneSelected(zone, selection) {
  if (!selection) return false
  if (selection.type === 'zoneGroup') return selection.id === zone.id
  if (selection.type === 'empty') return selection.id === zone.id
  if (selection.type === 'area') return zone.areaIds.includes(selection.id)
  return false
}

/* Resalte visual comun de "zona valida para soltar aqui" — borde y
   fondo azules + texto opcional, nunca solo color (siempre lleva
   texto en alguna parte del padre). */
function dropHighlightSx(isOver) {
  if (!isOver) return {}
  return { borderColor: '#3B82F6 !important', bgcolor: (t) => `${alpha('#3B82F6', t.palette.mode === 'dark' ? 0.22 : 0.14)} !important`, boxShadow: '0 0 0 3px rgba(59,130,246,.25) !important' }
}

/* Cada linea (2..10) se dibuja como una barra fisica vertical (no un
   boton redondo) — numero de linea arriba, "riel" de color al
   centro, conteo real abajo. Linea 1 y Linea de proyecto son
   horizontales (ver HorizontalAreaBar). Tambien es destino de
   soltar: arrastrar a alguien aqui NUNCA elige estacion por si
   sola, solo marca la linea — el picker de estacion se abre despues
   (DndAssignProvider). */
function LineBar({ lineId, selected, onClick }) {
  const count = getAreaHeadcount(lineId)
  const line = workCenterById(lineId)
  const label = line?.name || lineId
  const color = ZONE_COLORS.FFT
  const hasPeople = count > 0
  const tone = staffingTone(count, line?.idealHeadcount ?? null)
  const { isOver, dropProps } = useEmployeeDropTarget(lineId)
  return (
    <Box
      {...dropProps}
      onClick={(e) => { e.stopPropagation(); onClick(lineId) }}
      sx={{
        flex: '1 1 0', minWidth: 50, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 1.5, cursor: 'pointer', userSelect: 'none', py: 1, px: 0.25,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.3),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.3 : 0.18) : (t.palette.mode === 'dark' ? 0.1 : 0.06)),
        boxShadow: selected ? `0 0 0 2px ${alpha(color, 0.25)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.2 : 0.11) },
        ...dropHighlightSx(isOver),
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 11, lineHeight: 1.1, whiteSpace: 'nowrap' }}>{label}</Typography>
      <Box sx={{
        width: 6, flex: 1, borderRadius: 999, my: 0.5,
        bgcolor: hasPeople ? color : alpha(color, 0.18),
      }} />
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: tone ? tone.chipColor : 'text.secondary' }}>
        {tone ? tone.chipLabel : count}
      </Typography>
    </Box>
  )
}

/* Barra horizontal generica — Linea 1 y Linea de proyecto (CT1/CT0
   del pizarron), dibujadas a la derecha del bloque de lineas
   verticales, igual que en el piso real. Misma logica de
   datos/drop que LineBar, solo cambia la orientacion visual; el
   drop target ya sabe por si solo si `areaId` es una linea
   (abre el picker de estacion) o no. */
function HorizontalAreaBar({ areaId, selected, onClick, sx }) {
  const count = getAreaHeadcount(areaId)
  const area = workCenterById(areaId)
  const color = ZONE_COLORS.FFT
  const hasPeople = count > 0
  const tone = staffingTone(count, area?.idealHeadcount ?? null)
  const { isOver, dropProps } = useEmployeeDropTarget(areaId)
  return (
    <Box
      {...dropProps}
      onClick={(e) => { e.stopPropagation(); onClick(areaId) }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, width: '100%', minHeight: 46,
        borderRadius: 1.5, cursor: 'pointer', userSelect: 'none', px: 1.25, py: 1,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.3),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.3 : 0.18) : (t.palette.mode === 'dark' ? 0.1 : 0.06)),
        boxShadow: selected ? `0 0 0 2px ${alpha(color, 0.25)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.2 : 0.11) },
        ...dropHighlightSx(isOver),
        ...sx,
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 12.5, letterSpacing: 0.2, flexShrink: 0 }}>{area?.name || areaId}</Typography>
      <Box sx={{ flex: 1, height: 6, borderRadius: 999, bgcolor: hasPeople ? color : alpha(color, 0.18) }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: tone ? tone.chipColor : 'text.secondary', flexShrink: 0 }}>
        {tone ? tone.chipLabel : count}
      </Typography>
      {tone && (
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: tone.statusColor, flexShrink: 0 }}>{tone.statusLabel}</Typography>
      )}
    </Box>
  )
}

/* Tag compacto de una persona real — usado como muestra dentro de
   Palletizing/Accessories/Proyecto, igual al lenguaje visual del
   mockup aprobado (icono + nombre). Nunca lleva numero de empleado
   inventado. Tambien es origen de arrastre (mover a otra area). */
function PersonTag({ id, name }) {
  const chip = (
    <Chip
      size="small"
      icon={<PersonIcon sx={{ fontSize: 13 }} />}
      label={name}
      sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
    />
  )
  if (!id) return chip
  return <DraggablePersonChip employeeId={id}>{chip}</DraggablePersonChip>
}

/* Cuadricula decorativa (estaciones/slots fisicos) — puramente
   visual, no representa datos reales por celda; se usa para dar
   presencia a zonas pequenas como Midea/High Value. */
function MiniGridDecoration({ color, rows = 2, cols = 5 }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0.4, width: '100%', alignContent: 'center' }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <Box key={i} sx={{ aspectRatio: '1', borderRadius: 0.5, bgcolor: alpha(color, 0.22), border: '1px solid', borderColor: alpha(color, 0.4) }} />
      ))}
    </Box>
  )
}

/* Muestra de personal real en tags — usada dentro de Palletizing,
   Accessories y Proyecto para que la zona se sienta "viva" en vez de
   una caja vacia, sin inventar a nadie ni mostrar mas de lo que
   realmente hay (TAG_SAMPLE_LIMIT). */
function PersonTagSample({ areaId }) {
  const people = getPeopleByArea()[areaId] || []
  if (people.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignContent: 'flex-start', width: '100%' }}>
      {people.slice(0, TAG_SAMPLE_LIMIT).map((p) => <PersonTag key={p.id} id={p.id} name={p.name} />)}
    </Box>
  )
}

function ZoneBox({ zone, selected, onClick, minHeight, sx, children }) {
  const color = ZONE_COLORS[zone.id] || '#64748B'
  const hasData = zone.areaIds.length > 0
  const count = headcountForZone(zone)
  const ideal = idealForZone(zone)
  const tone = staffingTone(count, ideal)
  const dropAreaId = zone.areaIds.length === 1 ? zone.areaIds[0] : null
  const { isOver, dropProps } = useEmployeeDropTarget(dropAreaId)
  return (
    <Box
      {...dropProps}
      onClick={() => onClick(zone)}
      sx={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 0.5,
        borderRadius: 2.5, cursor: 'pointer', userSelect: 'none', p: 1.5, minHeight,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.32),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.2 : 0.12) : (t.palette.mode === 'dark' ? 0.07 : 0.045)),
        boxShadow: selected ? `0 0 0 3px ${alpha(color, 0.2)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.14 : 0.08) },
        ...sx,
        ...dropHighlightSx(isOver),
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'text.primary', lineHeight: 1.2 }}>
          {zone.label}
        </Typography>
        {!hasData ? (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic', flexShrink: 0 }}>Sin datos</Typography>
        ) : tone ? (
          <Chip size="small" label={tone.chipLabel} sx={{ height: 20, fontSize: 10.5, fontWeight: 800, flexShrink: 0, bgcolor: tone.chipBg, color: tone.chipColor }} />
        ) : (
          <Chip size="small" label={`${count} persona${count === 1 ? '' : 's'}`} sx={{ height: 20, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }} />
        )}
      </Stack>
      {tone && (
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: tone.statusColor }}>{tone.statusLabel}</Typography>
      )}
      {isOver && dropAreaId && (
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#3B82F6' }}>Soltar para asignar a {zone.label}</Typography>
      )}
      {children && <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-start' }}>{children}</Box>}
    </Box>
  )
}

/* Franja horizontal del Conveyor — junto a Sellado, en la parte
   inferior del layout (igual que en el pizarron real del piso). */
function ConveyorBanner({ selected, onClick }) {
  const zone = PHYSICAL_ZONES.CONVEYOR
  const color = ZONE_COLORS.CONVEYOR
  const staffing = getAreaStaffing('CONVEYOR')
  const tone = staffingTone(staffing.real, staffing.ideal)
  const people = getPeopleByArea()['CONVEYOR'] || []
  const { isOver, dropProps } = useEmployeeDropTarget('CONVEYOR')
  return (
    <Box
      {...dropProps}
      onClick={() => onClick(zone)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', height: '100%',
        borderRadius: 2, cursor: 'pointer', userSelect: 'none', px: 1.75, py: 1,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.32),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.2 : 0.12) : (t.palette.mode === 'dark' ? 0.07 : 0.045)),
        transition: 'all .15s ease',
        '&:hover': { borderColor: color },
        ...dropHighlightSx(isOver),
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {zone.label}
      </Typography>
      {tone ? (
        <>
          <Chip size="small" label={tone.chipLabel} sx={{ height: 20, fontSize: 10.5, fontWeight: 800, bgcolor: tone.chipBg, color: tone.chipColor }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: tone.statusColor }}>{tone.statusLabel}</Typography>
        </>
      ) : (
        <Chip size="small" label={`${staffing.real} persona${staffing.real === 1 ? '' : 's'}`} sx={{ height: 20, fontSize: 10.5, fontWeight: 700 }} />
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1 }}>
        {people.slice(0, 2).map((p) => <PersonTag key={p.id} id={p.id} name={p.name} />)}
      </Box>
    </Box>
  )
}

const GRID_COLUMNS = '1.3fr 1fr 2.4fr 1fr'

export default function WorkAreaMap({ selection, onSelect }) {
  const [zoom, setZoom] = useState(1)
  usePersonnelVersion()
  const operating = hasAnyPersonnelToday()

  function handleZoneClick(zoneKey) {
    onSelect(describeZoneSelection(PHYSICAL_ZONES[zoneKey]))
  }

  function handleAreaClick(areaId) {
    onSelect({ type: 'area', id: areaId })
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1} sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: operating ? '#10B981' : '#94A3B8' }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}>
            {operating ? 'Área operando' : 'Sin actividad hoy'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            startIcon={<CenterFocusStrongIcon fontSize="small" />}
            onClick={() => setZoom(1)}
            sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}
          >
            Ajustar vista
          </Button>
          <Tooltip title="Alejar">
            <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <Tooltip title="Acercar">
            <IconButton size="small" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ampliar vista">
            <IconButton size="small" onClick={() => setZoom(1.3)}>
              <OpenInFullIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform .15s ease', width: `${100 / zoom}%` }}>
          <Box sx={{
            display: 'grid', gap: 1.5, minWidth: 960,
            gridTemplateColumns: GRID_COLUMNS,
            gridTemplateRows: 'auto 400px auto',
            gridTemplateAreas: `
              "acc        insumos    insumos    suministro"
              "palletizing midea     fft        side"
              "sellado    sellado    conveyor   conveyor"
            `,
          }}>
            <Box sx={{ gridArea: 'acc' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.ACCESSORIES}
                selected={isZoneSelected(PHYSICAL_ZONES.ACCESSORIES, selection)}
                onClick={() => handleZoneClick('ACCESSORIES')}
                minHeight={64}
              >
                <PersonTagSample areaId="ACCESORIOS" />
              </ZoneBox>
            </Box>

            <Box sx={{ gridArea: 'insumos' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.INSUMOS}
                selected={isZoneSelected(PHYSICAL_ZONES.INSUMOS, selection)}
                onClick={() => handleZoneClick('INSUMOS')}
                minHeight={64}
              />
            </Box>

            <Box sx={{ gridArea: 'suministro' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.SUMINISTRO}
                selected={isZoneSelected(PHYSICAL_ZONES.SUMINISTRO, selection)}
                onClick={() => handleZoneClick('SUMINISTRO')}
                minHeight={64}
              />
            </Box>

            <Box sx={{ gridArea: 'palletizing', height: '100%' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.PALLETIZING}
                selected={isZoneSelected(PHYSICAL_ZONES.PALLETIZING, selection)}
                onClick={() => handleZoneClick('PALLETIZING')}
                sx={{ height: '100%' }}
              >
                <Stack direction="row" spacing={1.25} sx={{ width: '100%', height: '100%' }}>
                  <Box sx={{
                    width: '32%', minWidth: 60, borderRadius: 1.5, alignSelf: 'stretch',
                    bgcolor: (t) => alpha(ZONE_COLORS.PALLETIZING, t.palette.mode === 'dark' ? 0.12 : 0.09),
                    border: '1px dashed', borderColor: alpha(ZONE_COLORS.PALLETIZING, 0.4),
                  }} />
                  <Box sx={{ flex: 1 }}>
                    <PersonTagSample areaId="PALETIZADO" />
                  </Box>
                </Stack>
              </ZoneBox>
            </Box>

            <Box sx={{ gridArea: 'midea', height: '100%' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.HIGHVALUE}
                selected={isZoneSelected(PHYSICAL_ZONES.HIGHVALUE, selection)}
                onClick={() => handleZoneClick('HIGHVALUE')}
                sx={{ height: '100%' }}
              >
                <MiniGridDecoration color={ZONE_COLORS.HIGHVALUE} rows={2} cols={4} />
              </ZoneBox>
            </Box>

            <Box sx={{ gridArea: 'fft', height: '100%' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.FFT}
                selected={isZoneSelected(PHYSICAL_ZONES.FFT, selection)}
                onClick={() => handleZoneClick('FFT')}
                sx={{ height: '100%' }}
              >
                <Box sx={{ display: 'flex', gap: 0.75, width: '100%', height: '100%' }}>
                  {VERTICAL_LINE_IDS.map((lineId) => (
                    <LineBar
                      key={lineId}
                      lineId={lineId}
                      selected={selection?.type === 'area' && selection.id === lineId}
                      onClick={handleAreaClick}
                    />
                  ))}
                </Box>
              </ZoneBox>
            </Box>

            <Box sx={{ gridArea: 'side', display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
              <HorizontalAreaBar
                areaId="LINEA1"
                selected={selection?.type === 'area' && selection.id === 'LINEA1'}
                onClick={handleAreaClick}
                sx={{ flex: 1 }}
              />
              <HorizontalAreaBar
                areaId="PROYECTO"
                selected={selection?.type === 'area' && selection.id === 'PROYECTO'}
                onClick={handleAreaClick}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ gridArea: 'sellado' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.SELLADO}
                selected={isZoneSelected(PHYSICAL_ZONES.SELLADO, selection)}
                onClick={() => handleZoneClick('SELLADO')}
                minHeight={64}
              />
            </Box>

            <Box sx={{ gridArea: 'conveyor' }}>
              <ConveyorBanner
                selected={isZoneSelected(PHYSICAL_ZONES.CONVEYOR, selection)}
                onClick={() => handleZoneClick('CONVEYOR')}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5 }}>
            {getAuxiliaryAreas().map((area) => (
              <AuxAreaBox
                key={area.id}
                area={area}
                selected={selection?.type === 'area' && selection.id === area.id}
                onClick={handleAreaClick}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        {Object.values(COLOR_GROUPS).map((g) => (
          <Stack key={g.label} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: g.color }} />
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{g.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

const NAME_INLINE_LIMIT = 5

/* Areas auxiliares (Cajas, Calidad, Team Lead, Supervisor, etc.) —
   se muestran debajo del bloque fisico principal, ordenadas por el
   layout real del Excel. Las que tienen poca gente muestran los
   nombres reales directamente en la caja (igual que el plano real,
   y arrastrables); las que tienen mas gente solo muestran el
   conteo, para no saturar el layout — el detalle completo sigue
   estando a un click de distancia en el panel. Tambien es destino
   de soltar. */
function AuxAreaBox({ area, selected, onClick }) {
  const color = colorForArea(area.id)
  const people = getPeopleByArea()[area.id] || []
  const showNames = people.length > 0 && people.length <= NAME_INLINE_LIMIT
  const tone = staffingTone(people.length, area.idealHeadcount ?? null)
  const { isOver, dropProps } = useEmployeeDropTarget(area.id)
  return (
    <Box
      {...dropProps}
      onClick={() => onClick(area.id)}
      sx={{
        flex: '1 1 150px', minWidth: 150, maxWidth: 210, borderRadius: 2, cursor: 'pointer', userSelect: 'none',
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.32), p: 1.25,
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.2 : 0.12) : (t.palette.mode === 'dark' ? 0.07 : 0.045)),
        boxShadow: selected ? `0 0 0 3px ${alpha(color, 0.2)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.14 : 0.08) },
        ...dropHighlightSx(isOver),
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: 'text.primary', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {area.name}
        </Typography>
        {tone ? (
          <Chip size="small" label={tone.chipLabel} sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: tone.chipBg, color: tone.chipColor }} />
        ) : (
          <Chip size="small" label={`${people.length} persona${people.length === 1 ? '' : 's'}`} sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
        )}
      </Stack>
      {tone && (
        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: tone.statusColor, mb: showNames ? 0.75 : 0 }}>{tone.statusLabel}</Typography>
      )}
      {showNames && (
        <Stack spacing={0.5}>
          {people.map((p) => (
            <DraggablePersonChip key={p.id} employeeId={p.id}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <EmployeeAvatar employee={{ name: p.name }} size={18} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.primary' }}>{p.name}</Typography>
              </Stack>
            </DraggablePersonChip>
          ))}
        </Stack>
      )}
    </Box>
  )
}
