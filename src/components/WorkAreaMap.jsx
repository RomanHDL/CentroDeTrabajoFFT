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
import { getAreaHeadcount, getPeopleByArea, hasAnyPersonnelToday } from '../data/production/personnelByArea'
import { workCenterById } from '../data/production/catalog'
import EmployeeAvatar from '../pages/centro-trabajo/EmployeeAvatar'

/* ─────────────────────────────────────────────
   WorkAreaMap — interpretacion web del plano fisico real del area
   de trabajo. MISMO sistema visual en Dashboard y Centro de Trabajo
   (aprobado por el usuario): no hay dos disenos distintos, solo dos
   formas de reaccionar al click (Dashboard abre un Drawer rapido,
   Centro de Trabajo abre panel + detalle completo) que decide cada
   pagina via onSelect().

   NO es una copia al pixel del CAD real, es una aproximacion de
   posicion/proporcion pensada para pantalla. FFT muestra sus 10
   lineas reales (LINEA1..LINEA10 del catalogo) como barras
   individuales — nunca se inventan lineas que no esten en el
   catalogo. NO existe "Linea 0": ese texto crudo del Excel se
   reclasifica como PROYECTO ("Linea de proyecto"), un area
   independiente que se dibuja debajo de Sorting, no dentro del
   bloque FFT. Los tags de nombres dentro de Palletizing/Accessories/
   Proyecto son una MUESTRA de personal real (personnelByArea.js),
   nunca inventados.
   ───────────────────────────────────────────── */

const ZONE_COLORS = {
  SORTING: '#64748B',
  PROYECTO: '#3B82F6',
  CONVEYOR: '#3B82F6',
  FFT: '#3B82F6',
  HIGHVALUE: '#F43F5E',
  MIDEA: '#A855F7',
  PALLETIZING: '#10B981',
  PNP: '#64748B',
  BOXPREP: '#F59E0B',
  ACCESSORIES: '#EF4444',
}

const TAG_SAMPLE_LIMIT = 8

function headcountForZone(zone) {
  return zone.areaIds.reduce((sum, id) => sum + getAreaHeadcount(id), 0)
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

/* Cada linea se dibuja como una barra fisica vertical (no un boton
   redondo) — numero de linea arriba, "riel" de color al centro,
   conteo real abajo. Todas ocupan el mismo ancho (flex:1) para leerse
   como bandas paralelas de una zona de produccion. */
function LineBar({ lineId, selected, onClick }) {
  const count = getAreaHeadcount(lineId)
  const line = workCenterById(lineId)
  const label = (line?.name || lineId).replace('Línea ', 'L')
  const color = ZONE_COLORS.FFT
  const hasPeople = count > 0
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onClick(lineId) }}
      sx={{
        flex: '1 1 0', minWidth: 42, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 1.5, cursor: 'pointer', userSelect: 'none', py: 1, px: 0.25,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.3),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.3 : 0.18) : (t.palette.mode === 'dark' ? 0.1 : 0.06)),
        boxShadow: selected ? `0 0 0 2px ${alpha(color, 0.25)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.2 : 0.11) },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 12, lineHeight: 1.1 }}>{label}</Typography>
      <Box sx={{
        width: 6, flex: 1, borderRadius: 999, my: 0.5,
        bgcolor: hasPeople ? color : alpha(color, 0.18),
      }} />
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>{count}</Typography>
    </Box>
  )
}

/* Tag compacto de una persona real — usado como muestra dentro de
   Palletizing/Accessories, igual al lenguaje visual del mockup
   aprobado (icono + nombre). Nunca lleva numero de empleado
   inventado. */
function PersonTag({ name }) {
  return (
    <Chip
      size="small"
      icon={<PersonIcon sx={{ fontSize: 13 }} />}
      label={name}
      sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
    />
  )
}

/* Cuadricula decorativa (estaciones/slots fisicos) — puramente
   visual, no representa datos reales por celda; se usa para dar
   presencia a zonas pequenas como High Value. */
function MiniGridDecoration({ color, rows = 2, cols = 5 }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0.4, width: '100%', alignContent: 'center' }}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <Box key={i} sx={{ aspectRatio: '1', borderRadius: 0.5, bgcolor: alpha(color, 0.22), border: '1px solid', borderColor: alpha(color, 0.4) }} />
      ))}
    </Box>
  )
}

/* Muestra de personal real en tags — usada dentro de Palletizing y
   Accessories para que la zona se sienta "viva" en vez de una caja
   vacia, sin inventar a nadie ni mostrar mas de lo que realmente
   hay (TAG_SAMPLE_LIMIT). */
function PersonTagSample({ areaId }) {
  const people = getPeopleByArea()[areaId] || []
  if (people.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignContent: 'flex-start', width: '100%' }}>
      {people.slice(0, TAG_SAMPLE_LIMIT).map((p) => <PersonTag key={p.id} name={p.name} />)}
    </Box>
  )
}

function ZoneBox({ zone, selected, onClick, minHeight, sx, children }) {
  const color = ZONE_COLORS[zone.id] || '#64748B'
  const hasData = zone.areaIds.length > 0
  const count = headcountForZone(zone)
  return (
    <Box
      onClick={() => onClick(zone)}
      sx={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 0.75,
        borderRadius: 2.5, cursor: 'pointer', userSelect: 'none', p: 1.5, minHeight,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.32),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.2 : 0.12) : (t.palette.mode === 'dark' ? 0.07 : 0.045)),
        boxShadow: selected ? `0 0 0 3px ${alpha(color, 0.2)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.14 : 0.08) },
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'text.primary', lineHeight: 1.2 }}>
          {zone.label}
        </Typography>
        {hasData ? (
          <Chip size="small" label={`${count} persona${count === 1 ? '' : 's'}`} sx={{ height: 20, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }} />
        ) : (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontStyle: 'italic', flexShrink: 0 }}>Sin datos</Typography>
        )}
      </Stack>
      {children && <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-start' }}>{children}</Box>}
    </Box>
  )
}

/* Franja horizontal del Conveyor, arriba del bloque FFT — igual que
   en el plano real, el conveyor corre transversal por encima de las
   lineas. */
function ConveyorBanner({ selected, onClick }) {
  const zone = PHYSICAL_ZONES.CONVEYOR
  const color = ZONE_COLORS.CONVEYOR
  const count = getAreaHeadcount('CONVEYOR')
  const people = getPeopleByArea()['CONVEYOR'] || []
  return (
    <Box
      onClick={() => onClick(zone)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
        borderRadius: 2, cursor: 'pointer', userSelect: 'none', px: 1.75, py: 1,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.32),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.2 : 0.12) : (t.palette.mode === 'dark' ? 0.07 : 0.045)),
        transition: 'all .15s ease',
        '&:hover': { borderColor: color },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {zone.label}
      </Typography>
      <Chip size="small" label={`${count} persona${count === 1 ? '' : 's'}`} sx={{ height: 20, fontSize: 10.5, fontWeight: 700 }} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1 }}>
        {people.slice(0, 2).map((p) => <PersonTag key={p.id} name={p.name} />)}
      </Box>
    </Box>
  )
}

export default function WorkAreaMap({ selection, onSelect }) {
  const [zoom, setZoom] = useState(1)
  const operating = hasAnyPersonnelToday()

  function handleZoneClick(zoneKey) {
    onSelect(describeZoneSelection(PHYSICAL_ZONES[zoneKey]))
  }

  function handleLineClick(lineId) {
    onSelect({ type: 'area', id: lineId })
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
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              minWidth: 860,
              gridTemplateColumns: { xs: '1fr', md: '1fr 2.2fr 1.1fr' },
              gridTemplateAreas: {
                xs: `"sorting" "conveyor" "fft" "extras" "palletizing"`,
                md: `"sorting conveyor palletizing" "sorting fft palletizing" "sorting extras palletizing"`,
              },
            }}
          >
            <Box sx={{ gridArea: 'sorting', display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.SORTING}
                selected={isZoneSelected(PHYSICAL_ZONES.SORTING, selection)}
                onClick={() => handleZoneClick('SORTING')}
                sx={{ flex: 4 }}
              />
              <ZoneBox
                zone={PHYSICAL_ZONES.PROYECTO}
                selected={isZoneSelected(PHYSICAL_ZONES.PROYECTO, selection)}
                onClick={() => handleZoneClick('PROYECTO')}
                sx={{ flex: 6 }}
              >
                <PersonTagSample areaId="PROYECTO" />
              </ZoneBox>
            </Box>

            <Box sx={{ gridArea: 'conveyor' }}>
              <ConveyorBanner
                selected={isZoneSelected(PHYSICAL_ZONES.CONVEYOR, selection)}
                onClick={() => handleZoneClick('CONVEYOR')}
              />
            </Box>

            <Box sx={{ gridArea: 'fft', display: 'flex', gap: 1.5 }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.FFT}
                selected={isZoneSelected(PHYSICAL_ZONES.FFT, selection)}
                onClick={() => handleZoneClick('FFT')}
                minHeight={360}
                sx={{ flex: 3 }}
              >
                <Box sx={{ display: 'flex', gap: 0.75, width: '100%', height: '100%' }}>
                  {FFT_LINE_IDS.map((lineId) => (
                    <LineBar
                      key={lineId}
                      lineId={lineId}
                      selected={selection?.type === 'area' && selection.id === lineId}
                      onClick={handleLineClick}
                    />
                  ))}
                </Box>
              </ZoneBox>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <ZoneBox
                  zone={PHYSICAL_ZONES.HIGHVALUE}
                  selected={isZoneSelected(PHYSICAL_ZONES.HIGHVALUE, selection)}
                  onClick={() => handleZoneClick('HIGHVALUE')}
                  minHeight={172}
                  sx={{ flex: 1 }}
                >
                  <MiniGridDecoration color={ZONE_COLORS.HIGHVALUE} rows={2} cols={5} />
                </ZoneBox>
                <ZoneBox
                  zone={PHYSICAL_ZONES.MIDEA}
                  selected={isZoneSelected(PHYSICAL_ZONES.MIDEA, selection)}
                  onClick={() => handleZoneClick('MIDEA')}
                  minHeight={172}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>

            <Box sx={{ gridArea: 'palletizing' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.PALLETIZING}
                selected={isZoneSelected(PHYSICAL_ZONES.PALLETIZING, selection)}
                onClick={() => handleZoneClick('PALLETIZING')}
                minHeight={640}
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

            <Box sx={{ gridArea: 'extras', display: 'flex', gap: 1.5 }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.PNP}
                selected={isZoneSelected(PHYSICAL_ZONES.PNP, selection)}
                onClick={() => handleZoneClick('PNP')}
                minHeight={170}
                sx={{ flex: 1 }}
              />
              <ZoneBox
                zone={PHYSICAL_ZONES.BOXPREP}
                selected={isZoneSelected(PHYSICAL_ZONES.BOXPREP, selection)}
                onClick={() => handleZoneClick('BOXPREP')}
                minHeight={170}
                sx={{ flex: 1 }}
              />
              <ZoneBox
                zone={PHYSICAL_ZONES.ACCESSORIES}
                selected={isZoneSelected(PHYSICAL_ZONES.ACCESSORIES, selection)}
                onClick={() => handleZoneClick('ACCESSORIES')}
                minHeight={170}
                sx={{ flex: 1.4 }}
              >
                <PersonTagSample areaId="ACCESORIOS" />
              </ZoneBox>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5, minWidth: 860 }}>
            {getAuxiliaryAreas().map((area) => (
              <AuxAreaBox
                key={area.id}
                area={area}
                selected={selection?.type === 'area' && selection.id === area.id}
                onClick={(id) => onSelect({ type: 'area', id })}
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

/* Areas auxiliares (Cajas, DMT, Calidad, Team Lead, Supervisor,
   etc.) — se muestran debajo del bloque fisico principal, ordenadas
   por el layout real del Excel. Las que tienen poca gente muestran
   los nombres reales directamente en la caja (igual que el plano
   real); las que tienen mas gente solo muestran el conteo, para no
   saturar el layout — el detalle completo sigue estando a un click
   de distancia en el panel. */
function AuxAreaBox({ area, selected, onClick }) {
  const color = colorForArea(area.id)
  const people = getPeopleByArea()[area.id] || []
  const showNames = people.length > 0 && people.length <= NAME_INLINE_LIMIT
  return (
    <Box
      onClick={() => onClick(area.id)}
      sx={{
        flex: '1 1 150px', minWidth: 150, maxWidth: 210, borderRadius: 2, cursor: 'pointer', userSelect: 'none',
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.32), p: 1.25,
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.2 : 0.12) : (t.palette.mode === 'dark' ? 0.07 : 0.045)),
        boxShadow: selected ? `0 0 0 3px ${alpha(color, 0.2)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.14 : 0.08) },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: showNames ? 1 : 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: 'text.primary', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {area.name}
        </Typography>
        <Chip size="small" label={`${people.length} persona${people.length === 1 ? '' : 's'}`} sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
      </Stack>
      {showNames && (
        <Stack spacing={0.5}>
          {people.map((p) => (
            <Stack key={p.id} direction="row" spacing={0.6} alignItems="center">
              <EmployeeAvatar employee={{ name: p.name }} size={18} />
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.primary' }}>{p.name}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  )
}
