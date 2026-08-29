import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import SearchIcon from '@mui/icons-material/Search'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import { alpha } from '@mui/material/styles'
import { WORK_CENTERS, hasLineStations } from '../../data/production/catalog'
import { getAreaStaffing } from '../../data/production/personnelByArea'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useEmployeeDropTarget } from '../../ui/dnd'

/* ─────────────────────────────────────────────
   Rediseño 2026-08-24 (a petición explícita del usuario, mockup
   proporcionado) -- EXCLUSIVO de esta pestaña "Líneas". Cuadrícula
   uniforme (5 columnas en desktop grande) en vez del flex-wrap
   anterior (que dejaba una fila irregular 7+3). Sigue siendo
   ÚNICAMENTE Línea 1..10 (hasLineStations, igual que antes) -- Línea
   de Proyecto/CT LINEA 0 y el resto de áreas (Paletizado, Accesorios,
   Cajas, etc.) NUNCA aparecen aquí, viven en "Áreas de trabajo". No se
   tocó ninguna fuente de datos: REAL/IDEAL sigue viniendo de
   getAreaStaffing() (personnelByArea.js, ya excluye bajas y respeta
   asignación diaria real sobre snapshot), estaciones reales de
   getWorkstationsForLine() (workstations.js, distintas por línea --
   nunca se hardcodea "5 estaciones" para todas).

   Estado visual de 3 niveles (100% verde / 1-99% naranja / 0% rojo) es
   EXCLUSIVO de esta vista, a petición explícita del usuario ("esto es
   únicamente estado visual, no confundir con reglas de producción")
   -- no se tocó STATUS_META/statusFor de OperatingFloorPlan.jsx (4
   estados, otros colores), cada vista mantiene su propia semántica
   visual sin mezclarse. */

const VISUAL_STATUS = {
  COMPLETA: { color: '#10B981', label: 'Completa (100%)' },
  EN_PROGRESO: { color: '#F59E0B', label: 'En progreso (1-99%)' },
  SIN_PERSONAL: { color: '#EF4444', label: 'Sin personal (0%)' },
}

function visualStatusFor(pct) {
  if (pct >= 100) return 'COMPLETA'
  if (pct > 0) return 'EN_PROGRESO'
  return 'SIN_PERSONAL'
}

function normalize(text) {
  return text.toString().trim().toLowerCase()
}

/* Acepta "1".."10", "linea 3", "línea 3", "linea3", "ct linea 3" —
   cualquier forma razonable de referirse a una línea por número o
   nombre. */
function matchesQuery(linea, rawQuery) {
  const q = normalize(rawQuery)
  if (!q) return true
  const num = linea.id.replace('LINEA', '')
  const candidates = [
    normalize(linea.id),
    normalize(linea.name),
    `linea ${num}`,
    `línea ${num}`,
    `linea${num}`,
    num,
  ]
  return candidates.some((c) => c.includes(q))
}

export default function LineasTab({ onOpenLine }) {
  usePersonnelVersion()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')

  const lineas = useMemo(() => WORK_CENTERS.filter((w) => hasLineStations(w.id)), [])

  const rows = useMemo(() => lineas.map((linea) => {
    const staffing = getAreaStaffing(linea.id)
    const ideal = staffing.ideal || 0
    const real = staffing.real || 0
    const pct = ideal > 0 ? Math.min((real / ideal) * 100, 100) : 0
    const missing = Math.max(ideal - real, 0)
    const stationsCount = getWorkstationsForLine(linea.id).length
    return { linea, staffing, real, ideal, pct, missing, complete: real >= ideal && ideal > 0, stationsCount }
  }), [lineas])

  const filteredRows = useMemo(
    () => rows.filter((r) => matchesQuery(r.linea, query)),
    [rows, query],
  )

  const totals = useMemo(() => {
    const totalReal = rows.reduce((s, r) => s + r.real, 0)
    const totalIdeal = rows.reduce((s, r) => s + r.ideal, 0)
    const faltante = Math.max(totalIdeal - totalReal, 0)
    const coverage = totalIdeal > 0 ? (totalReal / totalIdeal) * 100 : 0
    return { totalReal, totalIdeal, faltante, coverage, count: rows.length }
  }, [rows])

  return (
    <Box>
      <Stack
        direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
            Líneas de producción FFT ({lineas.length})
          </Typography>
          <Tooltip title="Solo Línea 1 a Línea 10 — Cajas, Accesorios, Paletizado, Línea de Proyecto y demás áreas viven en 'Áreas de trabajo'.">
            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
          </Tooltip>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            size="small"
            placeholder="Buscar línea..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            size="small" exclusive value={view}
            onChange={(_, v) => v && setView(v)}
          >
            <ToggleButton value="grid" aria-label="Vista de cuadrícula"><GridViewIcon sx={{ fontSize: 18 }} /></ToggleButton>
            <ToggleButton value="lista" aria-label="Vista de lista"><ViewListIcon sx={{ fontSize: 18 }} /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {view === 'grid' ? (
        <Box
          sx={{
            display: 'grid', gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)', xl: 'repeat(5, 1fr)' },
          }}
        >
          {filteredRows.map((row) => (
            <LineaCard key={row.linea.id} row={row} onOpenLine={onOpenLine} />
          ))}
        </Box>
      ) : (
        <LineasListView rows={filteredRows} onOpenLine={onOpenLine} />
      )}

      {filteredRows.length === 0 && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Ninguna línea coincide con "{query}".
        </Typography>
      )}

      <SummaryPanel totals={totals} />

      <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', mt: 1.5 }}>
        Los datos se actualizan según las asignaciones del día actual (snapshot histórico mientras nadie
        registre a alguien hoy; en cuanto se registra o mueve, esa asignación real siempre gana).
      </Typography>
    </Box>
  )
}

function LineaCard({ row, onOpenLine }) {
  const { linea, real, ideal, pct, missing, complete, stationsCount } = row
  const statusKey = visualStatusFor(pct)
  const color = VISUAL_STATUS[statusKey].color
  const { isOver, dropProps } = useEmployeeDropTarget(linea.id)

  return (
    <Paper
      {...dropProps}
      elevation={0}
      onClick={() => onOpenLine?.(linea.id)}
      sx={{
        p: 1.75, borderRadius: '16px', cursor: 'pointer', userSelect: 'none',
        border: '1px solid', borderColor: isOver ? '#3B82F6' : 'divider',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        bgcolor: (t) => (isOver ? alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.06) : 'background.paper'),
        display: 'flex', flexDirection: 'column', gap: 1,
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(16,24,40,0.08)', borderColor: alpha('#3B82F6', 0.4) },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 800, fontSize: 14.5, flex: 1 }} noWrap>{linea.name}</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>
          {real} / {ideal} personas
        </Typography>
        <Chip
          size="small"
          label={complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`}
          sx={{
            height: 20, fontSize: 10.5, fontWeight: 700,
            bgcolor: complete ? alpha('#10B981', 0.14) : alpha('#EF4444', 0.12),
            color: complete ? '#10B981' : '#EF4444',
          }}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ flex: 1, height: 6, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
          <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: 999 }} />
        </Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>
          {Math.round(pct)}%
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5, mt: 'auto', borderTop: '1px dashed', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={0.6}>
          <PrecisionManufacturingIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
            {stationsCount} estaci{stationsCount === 1 ? 'ón' : 'ones'}
          </Typography>
        </Stack>
        <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
      </Stack>

      {isOver && (
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#3B82F6' }}>Soltar para elegir estación</Typography>
      )}
    </Paper>
  )
}

function LineasListView({ rows, onOpenLine }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Línea</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Personal</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Estado</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Cobertura</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Estaciones</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const { linea, real, ideal, pct, missing, complete, stationsCount } = row
            const color = VISUAL_STATUS[visualStatusFor(pct)].color
            return (
              <TableRow
                key={linea.id}
                hover
                onClick={() => onOpenLine?.(linea.id)}
                sx={{ cursor: 'pointer', '&:last-of-type td': { borderBottom: 0 } }}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{linea.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{real} / {ideal}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`}
                    sx={{
                      height: 20, fontSize: 10.5, fontWeight: 700,
                      bgcolor: complete ? alpha('#10B981', 0.14) : alpha('#EF4444', 0.12),
                      color: complete ? '#10B981' : '#EF4444',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 700, color }}>{Math.round(pct)}%</TableCell>
                <TableCell sx={{ fontSize: 13 }}>{stationsCount}</TableCell>
                <TableCell align="right"><ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Paper>
  )
}

function SummaryPanel({ totals }) {
  const items = [
    { label: 'Líneas totales', value: totals.count, icon: <PeopleAltIcon />, color: '#3B82F6' },
    { label: 'Personal asignado', value: `${totals.totalReal} / ${totals.totalIdeal}`, icon: <GroupsIcon />, color: '#10B981' },
    { label: 'Personal faltante', value: totals.faltante, icon: <PersonOffIcon />, color: '#EF4444' },
    { label: 'Cobertura general', value: `${totals.coverage.toFixed(1)}%`, icon: <DonutLargeIcon />, color: '#A855F7' },
  ]
  return (
    <Paper elevation={0} sx={{ mt: 2.5, p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.75 }}>
            Leyenda de estado
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {Object.values(VISUAL_STATUS).map((meta) => (
              <Stack key={meta.label} direction="row" spacing={0.6} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: meta.color }} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>{meta.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {items.map((item) => (
            <Stack
              key={item.label}
              direction="row" alignItems="center" spacing={1}
              sx={{
                px: 1.5, py: 1, borderRadius: 2, minWidth: 150,
                border: '1px solid', borderColor: alpha(item.color, 0.2),
                bgcolor: (t) => alpha(item.color, t.palette.mode === 'dark' ? 0.08 : 0.05),
              }}
            >
              <Box sx={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                bgcolor: alpha(item.color, 0.14), color: item.color,
                display: 'grid', placeItems: 'center', '& .MuiSvgIcon-root': { fontSize: 17 },
              }}>
                {item.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>{item.value}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 600 }}>{item.label}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  )
}
