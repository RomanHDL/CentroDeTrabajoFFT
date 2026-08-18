import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { alpha } from '@mui/material/styles'
import { workCenterById } from '../../data/production/catalog'
import { getPeopleByArea } from '../../data/production/personnelByArea'
import { EmptyState } from '../../ui'
import LineDetailDrawer from '../centro-trabajo/LineDetailDrawer'

/* ─────────────────────────────────────────────
   Interpretacion web del plano real del area de trabajo (el PDF/CAD
   que se compartio). NO es una copia al pixel del CAD — es una
   aproximacion de posicion/proporcion/relacion espacial, pensada
   para pantalla: cajas clickeables agrupadas igual que en el plano
   real (Sorting a la izquierda, el bloque de lineas FFT al centro
   con Midea arriba y Box Prep/PNP-POC-PEN/Accessories abajo,
   Palletizing a la derecha).

   "FFT" no es un area real individual de nuestro catalogo — es el
   nombre del bloque que agrupa las lineas LINEA0..LINEA10. Por eso
   su click abre primero un listado de lineas (ver ZoneLinesDrawer)
   en vez de ir directo al detalle de una sola area.

   Zonas como SORTING y PNP/POC/PEN aparecen en el plano real pero
   no tienen ninguna fila en el snapshot de BASE con esa zona
   exacta — se muestran igual en el mapa (para que se vea el plano
   completo) pero su detalle dice honestamente "sin datos", nunca
   se inventa personal ahi. */

const FFT_LINE_IDS = ['LINEA0', 'LINEA1', 'LINEA2', 'LINEA3', 'LINEA4', 'LINEA5', 'LINEA6', 'LINEA7', 'LINEA8', 'LINEA9', 'LINEA10']

const ZONES = {
  SORTING: { id: 'SORTING', label: 'Sorting', areaIds: [], color: '#64748B' },
  FFT: { id: 'FFT', label: 'FFT', areaIds: FFT_LINE_IDS, color: '#3B82F6' },
  MIDEA: { id: 'MIDEA', label: 'Midea and Mixed Products', areaIds: ['HIGH_VALUE'], color: '#A855F7' },
  PNP: { id: 'PNP', label: 'PNP / POC / PEN', areaIds: [], color: '#64748B' },
  BOXPREP: { id: 'BOXPREP', label: 'Box Prep', areaIds: ['CAJAS'], color: '#F59E0B' },
  ACCESSORIES: { id: 'ACCESSORIES', label: 'Accessories', areaIds: ['ACCESORIOS'], color: '#EF4444' },
  PALLETIZING: { id: 'PALLETIZING', label: 'Palletizing', areaIds: ['PALETIZADO'], color: '#10B981' },
}

function headcountFor(zone, peopleByArea) {
  return zone.areaIds.reduce((sum, id) => sum + (peopleByArea[id]?.length || 0), 0)
}

function ZoneBox({ zone, count, selected, onClick, dense, sx }) {
  const hasData = zone.areaIds.length > 0
  return (
    <Box
      onClick={() => onClick(zone)}
      sx={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: 0.4,
        borderRadius: 2, cursor: 'pointer', userSelect: 'none',
        border: '1.5px solid', borderColor: selected ? zone.color : alpha(zone.color, 0.35),
        bgcolor: (t) => alpha(zone.color, selected ? (t.palette.mode === 'dark' ? 0.22 : 0.14) : (t.palette.mode === 'dark' ? 0.08 : 0.05)),
        boxShadow: selected ? `0 0 0 3px ${alpha(zone.color, 0.22)}` : 'none',
        transition: 'all .15s ease',
        p: dense ? 1 : 1.5,
        minHeight: dense ? 56 : 90,
        '&:hover': { borderColor: zone.color, bgcolor: (t) => alpha(zone.color, t.palette.mode === 'dark' ? 0.16 : 0.09) },
        ...sx,
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: dense ? 11.5 : 13.5, color: 'text.primary', lineHeight: 1.2 }}>
        {zone.label}
      </Typography>
      {hasData ? (
        <Chip size="small" label={`${count} persona${count === 1 ? '' : 's'}`} sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
      ) : (
        <Typography sx={{ fontSize: 10, color: 'text.secondary', fontStyle: 'italic' }}>Sin datos</Typography>
      )}
    </Box>
  )
}

export default function FactoryLayoutMap() {
  const peopleByArea = useMemo(() => getPeopleByArea(), [])
  const [selectedZoneId, setSelectedZoneId] = useState(null)
  const [selectedLineId, setSelectedLineId] = useState(null)

  const selectedZone = selectedZoneId ? ZONES[selectedZoneId] : null

  function handleZoneClick(zone) {
    if (zone.areaIds.length === 1) {
      setSelectedLineId(zone.areaIds[0])
    } else {
      setSelectedZoneId(zone.id)
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          minWidth: { xs: 560, md: 0 },
          gridTemplateColumns: { xs: '1fr', md: '1.5fr 2fr 1.1fr' },
          gridTemplateAreas: {
            xs: `"sorting" "fft" "extras" "palletizing"`,
            md: `"sorting fft palletizing" "sorting extras palletizing"`,
          },
        }}
      >
        <Box sx={{ gridArea: 'sorting' }}>
          <ZoneBox zone={ZONES.SORTING} count={headcountFor(ZONES.SORTING, peopleByArea)} selected={selectedZoneId === 'SORTING'} onClick={handleZoneClick} sx={{ height: '100%', minHeight: 160 }} />
        </Box>

        <Box sx={{ gridArea: 'fft', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ZoneBox zone={ZONES.FFT} count={headcountFor(ZONES.FFT, peopleByArea)} selected={selectedZoneId === 'FFT'} onClick={handleZoneClick} sx={{ flex: 3, minHeight: 110 }} />
            <ZoneBox zone={ZONES.MIDEA} count={headcountFor(ZONES.MIDEA, peopleByArea)} selected={selectedZoneId === 'MIDEA'} onClick={handleZoneClick} dense sx={{ flex: 1 }} />
          </Box>
        </Box>

        <Box sx={{ gridArea: 'palletizing' }}>
          <ZoneBox zone={ZONES.PALLETIZING} count={headcountFor(ZONES.PALLETIZING, peopleByArea)} selected={selectedZoneId === 'PALLETIZING'} onClick={handleZoneClick} sx={{ height: '100%', minHeight: 160 }} />
        </Box>

        <Box sx={{ gridArea: 'extras', display: 'flex', gap: 1 }}>
          <ZoneBox zone={ZONES.PNP} count={headcountFor(ZONES.PNP, peopleByArea)} selected={selectedZoneId === 'PNP'} onClick={handleZoneClick} dense sx={{ flex: 1 }} />
          <ZoneBox zone={ZONES.BOXPREP} count={headcountFor(ZONES.BOXPREP, peopleByArea)} selected={selectedZoneId === 'BOXPREP'} onClick={handleZoneClick} dense sx={{ flex: 1 }} />
          <ZoneBox zone={ZONES.ACCESSORIES} count={headcountFor(ZONES.ACCESSORIES, peopleByArea)} selected={selectedZoneId === 'ACCESSORIES'} onClick={handleZoneClick} dense sx={{ flex: 1 }} />
        </Box>
      </Box>

      {/* Zona con varias lineas (FFT) o sin ninguna area real (Sorting/PNP): drawer intermedio */}
      <Drawer anchor="right" open={!!selectedZone} onClose={() => setSelectedZoneId(null)}>
        <Box sx={{ width: { xs: '100vw', sm: 380 }, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{selectedZone?.label}</Typography>
            <IconButton onClick={() => setSelectedZoneId(null)}><CloseIcon /></IconButton>
          </Box>

          {selectedZone && selectedZone.areaIds.length === 0 && (
            <EmptyState
              compact
              title="Sin datos de personal todavía"
              description="Esta zona aparece en el plano real, pero todavía no hay una fuente de personal conectada a ella."
            />
          )}

          {selectedZone && selectedZone.areaIds.length > 1 && (
            <>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                {selectedZone.label} agrupa estas líneas — selecciona una para ver su personal:
              </Typography>
              <List sx={{ py: 0 }}>
                {selectedZone.areaIds.map((areaId) => {
                  const area = workCenterById(areaId)
                  const count = peopleByArea[areaId]?.length || 0
                  return (
                    <ListItemButton
                      key={areaId}
                      onClick={() => { setSelectedLineId(areaId); setSelectedZoneId(null) }}
                      sx={{ borderRadius: 1.5, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={area?.name || areaId}
                        secondary={`${count} persona${count === 1 ? '' : 's'} en el snapshot real`}
                        primaryTypographyProps={{ fontWeight: 700, fontSize: 13.5 }}
                        secondaryTypographyProps={{ fontSize: 11.5 }}
                      />
                      <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </ListItemButton>
                  )
                })}
              </List>
            </>
          )}
        </Box>
      </Drawer>

      <LineDetailDrawer workCenterId={selectedLineId} open={!!selectedLineId} onClose={() => setSelectedLineId(null)} />
    </Box>
  )
}
