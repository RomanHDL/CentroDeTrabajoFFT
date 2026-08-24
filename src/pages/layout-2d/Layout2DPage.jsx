import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { workCenterById } from '../../data/production/catalog'
import { getAreaHeadcount, getAreaStaffing } from '../../data/production/personnelByArea'
import { colorForArea } from '../../data/production/layoutZones'
import { DRAWN_ZONES, REFERENCE_ONLY_ZONES, getUnplottedAreas } from '../../data/production/floorPlanZones'

/* ─────────────────────────────────────────────
   Layout 2D -- vista de solo lectura, solo ADMINISTRADOR (ver
   Sidebar.jsx/App.jsx: igual que /usuarios, nunca configurable por
   RoleModuleAccess). Aproxima el plano fisico real (fragmento CAD
   compartido 2026-08-24 -- ver floorPlanZones.js para el detalle de
   que zonas SI tienen posicion real dibujada y cuales no). Los
   conteos en vivo salen de las mismas funciones que ya usa
   AreaSummaryStrip/WorkAreaMap (getAreaHeadcount/getAreaStaffing en
   personnelByArea.js) -- ninguna fuente de datos paralela, y
   usePersonnelVersion() ya cubre tanto cambios locales como el
   sondeo del backend real (apiSync.js, Fase 2) sin plomeria extra. */
export default function Layout2DPage() {
  const ps = usePageStyles()
  const version = usePersonnelVersion()

  const drawn = useMemo(() => DRAWN_ZONES.map((z) => {
    const wc = workCenterById(z.areaId)
    const staffing = getAreaStaffing(z.areaId)
    return { ...z, wc, staffing }
  }), [version])

  const unplotted = useMemo(() => getUnplottedAreas().map((wc) => ({
    wc, count: getAreaHeadcount(wc.id),
  })), [version])

  return (
    <Box sx={ps.page}>
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={ps.pageTitle}>Layout 2D</Typography>
            <Typography sx={ps.pageSubtitle}>
              Plano físico de referencia con personal en vivo por zona · Solo Administrador
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 2.5 }}>
          <Alert severity="info" sx={{ mb: 2.5 }}>
            Este plano es un fragmento del layout real del piso — no todas las áreas del catálogo tienen una posición
            confirmada aquí. Las 10 líneas se muestran en el orden del catálogo (Línea 1..10), no en una correspondencia
            física verificada bahía por bahía. Las áreas sin posición en este fragmento aparecen abajo, en "Otras áreas".
          </Alert>

          <FloorPlanGrid drawn={drawn} />

          <Typography sx={{ ...ps.sectionTitle, mt: 3, mb: 1.25 }}>Otras áreas (sin posición en este plano)</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {unplotted.map(({ wc, count }) => (
              <ZoneCard key={wc.id} name={wc.name} count={count} ideal={wc.idealHeadcount} color={colorForArea(wc.id)} />
            ))}
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

function FloorPlanGrid({ drawn }) {
  const byGridArea = Object.fromEntries(drawn.map((z) => [z.gridArea, z]))
  const lineAreas = Array.from({ length: 10 }, (_, i) => `line${i + 1}`)

  const templateAreas = [
    `"conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor conveyor palletizing"`,
    `"${lineAreas.join(' ')} palletizing"`,
    `"midea midea accessories accessories accessories accessories accessories accessories accessories accessories palletizing"`,
    `"pnp boxprep accessories accessories accessories accessories accessories accessories accessories accessories palletizing"`,
  ].join(' ')

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, minmax(64px, 1fr)) minmax(160px, 1.4fr)',
        gridTemplateRows: '56px 96px 88px 88px',
        gap: 1,
        gridTemplateAreas: templateAreas,
        minWidth: 900,
        overflowX: 'auto',
      }}
    >
      <PlanCell gridArea="conveyor" zone={byGridArea.conveyor} />
      {lineAreas.map((ga) => <PlanCell key={ga} gridArea={ga} zone={byGridArea[ga]} compact />)}
      <PlanCell gridArea="midea" zone={byGridArea.midea} />
      <PlanCell gridArea="palletizing" zone={byGridArea.palletizing} tall />
      <PlanCell gridArea="accessories" zone={byGridArea.accessories} />
      {REFERENCE_ONLY_ZONES.map((z) => <PlanCell key={z.gridArea} gridArea={z.gridArea} referenceLabel={z.label} />)}
    </Box>
  )
}

function PlanCell({ gridArea, zone, compact, tall, referenceLabel }) {
  if (referenceLabel) {
    return (
      <Box sx={{
        gridArea, borderRadius: 1.5, border: '1px dashed', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.75,
        color: 'text.disabled', fontSize: 10.5, fontWeight: 700, textAlign: 'center',
      }}>
        {referenceLabel}
      </Box>
    )
  }
  if (!zone) return <Box sx={{ gridArea }} />

  const { wc, staffing } = zone
  const color = colorForArea(wc.id)
  const hasIdeal = staffing.ideal != null
  const complete = hasIdeal && staffing.real >= staffing.ideal

  return (
    <Box
      sx={{
        gridArea, borderRadius: 1.5, p: compact ? 0.75 : 1.25,
        border: '1px solid', borderColor: 'divider', borderTop: `3px solid ${color}`,
        display: 'flex', flexDirection: 'column', justifyContent: tall ? 'flex-start' : 'center',
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.06 : 0.04),
        overflow: 'hidden',
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: compact ? 10.5 : 12.5, lineHeight: 1.15 }}>{wc.name}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: compact ? 13 : 17, mt: 0.25 }}>
        {hasIdeal ? `${staffing.real} / ${staffing.ideal}` : staffing.real}
      </Typography>
      {hasIdeal && (
        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: complete ? '#10B981' : '#EF4444' }}>
          {complete ? 'Completa' : `Faltan ${staffing.ideal - staffing.real}`}
        </Typography>
      )}
    </Box>
  )
}

function ZoneCard({ name, count, ideal, color }) {
  const hasIdeal = ideal != null
  const complete = hasIdeal && count >= ideal
  return (
    <Paper elevation={0} sx={{
      minWidth: 140, flex: '1 1 140px', maxWidth: 190, p: 1.5, borderRadius: 2,
      border: '1px solid', borderColor: 'divider', borderLeft: `3px solid ${color}`,
    }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{name}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 18, mt: 0.25 }}>{hasIdeal ? `${count} / ${ideal}` : count}</Typography>
      {hasIdeal ? (
        <Typography sx={{ fontSize: 10.5, color: complete ? '#10B981' : '#EF4444', fontWeight: 700 }}>
          {complete ? 'Completa' : `Faltan ${ideal - count}`}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 10.5, color: count > 0 ? '#10B981' : 'text.secondary', fontWeight: 700 }}>
          {count > 0 ? 'Con personal' : 'Sin plantilla definida'}
        </Typography>
      )}
    </Paper>
  )
}
