import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import { alpha } from '@mui/material/styles'
import { PHYSICAL_ZONES, FFT_LINE_IDS, COLOR_GROUPS, getAuxiliaryAreas, colorForArea } from '../data/production/layoutZones'
import { getAreaHeadcount, getPeopleByArea } from '../data/production/personnelByArea'
import { workCenterById } from '../data/production/catalog'
import EmployeeAvatar from '../pages/centro-trabajo/EmployeeAvatar'

/* ─────────────────────────────────────────────
   WorkAreaMap — interpretacion web del plano fisico real del area
   de trabajo, compartida por Dashboard (vista rapida) y Centro de
   Trabajo (vista operativa completa). Es un componente controlado:
   no gestiona que se muestra al seleccionar, solo dibuja el plano y
   avisa por onSelect() — cada pagina decide si abre un Drawer
   (Dashboard) o un panel lateral fijo (Centro de Trabajo).

   NO es una copia al pixel del CAD real, es una aproximacion de
   posicion/proporcion pensada para pantalla, igual que ya se
   validaba en el FactoryLayoutMap anterior. FFT muestra ademas sus
   11 lineas reales (LINEA0..LINEA10 del catalogo) como cajas
   individuales — nunca se inventan lineas que no esten en el
   catalogo.
   ───────────────────────────────────────────── */

const ZONE_COLORS = {
  SORTING: '#64748B',
  FFT: '#3B82F6',
  MIDEA: '#A855F7',
  PALLETIZING: '#10B981',
  PNP: '#64748B',
  BOXPREP: '#F59E0B',
  ACCESSORIES: '#EF4444',
}

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
   como bandas paralelas de una zona de produccion, no como chips
   flotando sueltos. */
function LineBar({ lineId, selected, dense, onClick }) {
  const count = getAreaHeadcount(lineId)
  const line = workCenterById(lineId)
  const label = (line?.name || lineId).replace('Línea ', 'L')
  const color = ZONE_COLORS.FFT
  const hasPeople = count > 0
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onClick(lineId) }}
      sx={{
        flex: '1 1 0', minWidth: dense ? 32 : 42, height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 1.5, cursor: 'pointer', userSelect: 'none', py: dense ? 0.75 : 1, px: 0.25,
        border: '1.5px solid', borderColor: selected ? color : alpha(color, 0.3),
        bgcolor: (t) => alpha(color, selected ? (t.palette.mode === 'dark' ? 0.3 : 0.18) : (t.palette.mode === 'dark' ? 0.1 : 0.06)),
        boxShadow: selected ? `0 0 0 2px ${alpha(color, 0.25)}` : 'none',
        transition: 'all .15s ease',
        '&:hover': { borderColor: color, bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.2 : 0.11) },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: dense ? 10.5 : 12, lineHeight: 1.1 }}>{label}</Typography>
      <Box sx={{
        width: dense ? 4 : 6, flex: 1, borderRadius: 999, my: 0.5,
        bgcolor: hasPeople ? color : alpha(color, 0.18),
      }} />
      <Typography sx={{ fontSize: dense ? 9.5 : 10.5, color: 'text.secondary', fontWeight: 700 }}>{count}</Typography>
    </Box>
  )
}

const NAME_INLINE_LIMIT = 5

/* Areas auxiliares (Cajas, DMT, High Value, Team Lead, Supervisor,
   etc.) — se muestran debajo del bloque fisico principal, ordenadas
   por el layout real del Excel. Las que tienen poca gente muestran
   los nombres reales directamente en la caja (igual que el
   plano real); las que tienen mas gente solo muestran el conteo,
   para no saturar el layout — el detalle completo sigue estando a
   un click de distancia en el panel. */
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
      {children && <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>{children}</Box>}
    </Box>
  )
}

export default function WorkAreaMap({ selection, onSelect, size = 'md', showLegend = false }) {
  const [zoom, setZoom] = useState(1)
  const lg = size === 'lg'

  function handleZoneClick(zoneKey) {
    onSelect(describeZoneSelection(PHYSICAL_ZONES[zoneKey]))
  }

  function handleLineClick(lineId) {
    onSelect({ type: 'area', id: lineId })
  }

  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
        <Tooltip title="Alejar">
          <IconButton size="small" onClick={() => setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ajustar vista">
          <IconButton size="small" onClick={() => setZoom(1)}>
            <CenterFocusStrongIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Acercar">
          <IconButton size="small" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ overflow: 'auto' }}>
        <Box sx={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform .15s ease', width: `${100 / zoom}%` }}>
          <Box
            sx={{
              display: 'grid',
              gap: lg ? 1.5 : 1.25,
              minWidth: lg ? 820 : 700,
              gridTemplateColumns: { xs: '1fr', md: lg ? '1fr 2.2fr 1.1fr' : '1fr 2fr 1fr' },
              gridTemplateAreas: {
                xs: `"sorting" "fft" "extras" "palletizing"`,
                md: `"sorting fft palletizing" "sorting extras palletizing"`,
              },
            }}
          >
            <Box sx={{ gridArea: 'sorting' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.SORTING}
                selected={isZoneSelected(PHYSICAL_ZONES.SORTING, selection)}
                onClick={() => handleZoneClick('SORTING')}
                minHeight={380}
                sx={{ height: '100%' }}
              />
            </Box>

            <Box sx={{ gridArea: 'fft', display: 'flex', flexDirection: 'column', gap: lg ? 1.5 : 1 }}>
              <Box sx={{ display: 'flex', gap: lg ? 1.5 : 1, height: '100%' }}>
                <ZoneBox
                  zone={PHYSICAL_ZONES.FFT}
                  selected={isZoneSelected(PHYSICAL_ZONES.FFT, selection)}
                  onClick={() => handleZoneClick('FFT')}
                  minHeight={360}
                  sx={{ flex: 3 }}
                >
                  <Box sx={{ display: 'flex', gap: lg ? 0.75 : 0.5, width: '100%', height: '100%' }}>
                    {FFT_LINE_IDS.map((lineId) => (
                      <LineBar
                        key={lineId}
                        lineId={lineId}
                        dense={!lg}
                        selected={selection?.type === 'area' && selection.id === lineId}
                        onClick={handleLineClick}
                      />
                    ))}
                  </Box>
                </ZoneBox>
                <ZoneBox
                  zone={PHYSICAL_ZONES.MIDEA}
                  selected={isZoneSelected(PHYSICAL_ZONES.MIDEA, selection)}
                  onClick={() => handleZoneClick('MIDEA')}
                  minHeight={360}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>

            <Box sx={{ gridArea: 'palletizing' }}>
              <ZoneBox
                zone={PHYSICAL_ZONES.PALLETIZING}
                selected={isZoneSelected(PHYSICAL_ZONES.PALLETIZING, selection)}
                onClick={() => handleZoneClick('PALLETIZING')}
                minHeight={380}
                sx={{ height: '100%' }}
              />
            </Box>

            <Box sx={{ gridArea: 'extras', display: 'flex', gap: lg ? 1.5 : 1 }}>
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
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>

          {lg && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1.5, minWidth: 820 }}>
              {getAuxiliaryAreas().map((area) => (
                <AuxAreaBox
                  key={area.id}
                  area={area}
                  selected={selection?.type === 'area' && selection.id === area.id}
                  onClick={(id) => onSelect({ type: 'area', id })}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {showLegend && (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          {Object.values(COLOR_GROUPS).map((g) => (
            <Stack key={g.label} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: g.color }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{g.label}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  )
}
