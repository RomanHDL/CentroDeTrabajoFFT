import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import SearchIcon from '@mui/icons-material/Search'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import ViewListIcon from '@mui/icons-material/ViewList'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import SchoolIcon from '@mui/icons-material/School'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import PersonIcon from '@mui/icons-material/Person'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import GroupsIcon from '@mui/icons-material/Groups'
import Groups2Icon from '@mui/icons-material/Groups2'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import DonutLargeIcon from '@mui/icons-material/DonutLarge'
import { alpha } from '@mui/material/styles'
import { getAreaStaffing, getPeopleByArea, getGroupAreaStaffing } from '../../data/production/personnelByArea'
import { FFT_LINE_IDS, REFERENCE_ONLY_ZONES } from '../../data/production/floorPlanZones'
import { operationalGroupMembers } from '../../data/production/catalog'
import { colorForArea } from '../../data/production/layoutZones'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'

/* ─────────────────────────────────────────────
   Rediseño 2026-08-25 (a petición explícita del usuario, mockup
   proporcionado) -- EXCLUSIVO de esta pestaña "Estaciones". Antes era
   una tabla simple SOLO de Línea 1-10 (estaciones configuradas/
   ocupadas/disponibles); ahora es una vista ejecutiva de TODAS las
   áreas del centro de trabajo (no solo líneas), en cards con
   real/ideal, estado, barra de cobertura y estaciones -- igual
   lenguaje visual que ya se aprobó en "Líneas", pero para el catálogo
   completo. NO es un layout 2D (eso vive en /layout-2d y en "Áreas de
   trabajo") -- aquí no se dibuja ningún plano físico ni conveyors.

   AREA_SLOTS es una lista CURADA (igual patrón que
   SUPPORT_CARD_AREA_IDS/REFERENCE_ONLY_ZONES en floorPlanZones.js),
   no un filtro automático de catalog.js -- el usuario pidió
   exactamente estas 14 tarjetas, en este orden, ni una más ni una
   menos (CONVEYOR/SELLADO/PROYECTO/CAJAS NO aparecen aquí a propósito,
   viven en otras pestañas). "FFT" agrupa las 10 líneas reales (mismo
   cálculo que OperatingFloorPlan.jsx); "INSUMOS_SUMINISTRO" fusiona
   INSUMOS+SUMINISTRO_MATERIAL en una sola tarjeta (mismo criterio que
   InsumosSuministroZone en OperatingFloorPlan.jsx) -- ninguna de las
   dos fusiones inventa un area de catalogo nueva, solo agrupan la
   presentación de areas reales ya existentes.

   Estado visual de 4 niveles (Completa verde / Parcial naranja / Falta
   personal rojo / Sin personal gris) es EXCLUSIVO de esta vista, a
   petición explícita del usuario -- no se tocó STATUS_META de
   OperatingFloorPlan.jsx ni el de LineasTab.jsx (cada vista mantiene
   su propia semántica visual, "esto es únicamente estado visual, no
   confundir con reglas de producción"). Cuando el área no tiene
   plantilla oficial (idealHeadcount null en catalog.js, ej. Calidad,
   Insumos, Suministro) NUNCA se inventa un ideal -- se muestra
   "Sin plantilla definida" en vez de un % falso. */

const STATUS_META = {
  COMPLETA: { color: '#10B981', label: 'Completa (100% o más)' },
  PARCIAL: { color: '#F59E0B', label: 'Parcial (1-99%)' },
  FALTA_PERSONAL: { color: '#EF4444', label: 'Falta personal (0%)' },
  SIN_PERSONAL: { color: '#94A3B8', label: 'Sin personal' },
}

function statusFor(real, ideal) {
  if (ideal == null) return null
  if (real <= 0) return 'SIN_PERSONAL'
  const pct = (real / ideal) * 100
  if (pct >= 100) return 'COMPLETA'
  if (pct >= 50) return 'PARCIAL'
  return 'FALTA_PERSONAL'
}

function badgeFor(real, ideal) {
  if (ideal == null) return null
  if (real <= 0) return { text: 'Sin personal' }
  if (real >= ideal) return { text: 'Completa' }
  const missing = ideal - real
  return { text: missing === 1 ? 'Falta 1' : `Faltan ${missing}` }
}

/* La lista curada de tarjetas -- id sintético propio de esta vista
   (no siempre coincide 1:1 con un WORK_CENTER real, ver compute()). */
const AREA_SLOTS = [
  { id: 'FFT', name: 'WC Líneas de producción (FFT)', subtitle: 'líneas activas', badge: 'Líneas 1 - 10', icon: <PrecisionManufacturingIcon />, colorAreaId: 'LINEA1' },
  { id: 'HIGH_VALUE', name: 'WC Midea / High Value / DMT', subtitle: 'Productos mixtos', icon: <DevicesOtherIcon />, colorAreaId: 'HIGH_VALUE' },
  { id: 'PALETIZADO', name: 'WC Paletizado (Palletizing)', subtitle: 'Zona de paletizado', icon: <Inventory2Icon />, colorAreaId: 'PALETIZADO' },
  { id: 'INSUMOS_SUMINISTRO', name: 'WC Insumos y Suministro de Material', subtitle: 'PNP/POC/PEN · Box Prep · Suministro', icon: <ShoppingCartIcon />, colorAreaId: 'INSUMOS' },
  { id: 'ACCESORIOS', name: 'WC Accesorios', subtitle: 'Accesorios', icon: <LocalOfferIcon />, colorAreaId: 'ACCESORIOS' },
  { id: 'CALIDAD', name: 'WC Calidad', subtitle: 'Control de calidad', icon: <VerifiedUserIcon />, colorAreaId: 'CALIDAD' },
  { id: 'CAPACITACION', name: 'WC Capacitación', subtitle: 'Capacitación', icon: <SchoolIcon />, colorAreaId: 'CAPACITACION' },
  { id: 'TEAM_LEADER', name: 'WC Team Leader', subtitle: 'Liderazgo', icon: <SupervisorAccountIcon />, colorAreaId: 'TEAM_LEADER' },
  { id: 'ENTRENADOR', name: 'WC Entrenador', subtitle: 'Entrenamiento', icon: <SupportAgentIcon />, colorAreaId: 'ENTRENADOR' },
  { id: 'LIMPIEZA', name: 'WC Limpieza', subtitle: 'Limpieza', icon: <CleaningServicesIcon />, colorAreaId: 'LIMPIEZA' },
  { id: 'GERENTE', name: 'WC Gerente FFT', subtitle: 'Gerencia', icon: <PersonIcon />, colorAreaId: 'GERENTE' },
  { id: 'SUPERVISOR', name: 'WC Supervisor', subtitle: 'Supervisión', icon: <AssignmentIndIcon />, colorAreaId: 'SUPERVISOR' },
]

/* Placeholders sin área de catálogo mapeada (igual criterio que
   REFERENCE_ONLY_ZONES en floorPlanZones.js) -- nunca se les inventa
   un id de área ni se les fuerza un mapeo incierto; "Asignar personal"
   manda al formulario general de Registro de personal, donde sí se
   elige un área real. */
const PLACEHOLDER_SLOTS = REFERENCE_ONLY_ZONES

function computeRow(slot) {
  if (slot.id === 'FFT') {
    const real = FFT_LINE_IDS.reduce((s, id) => s + (getPeopleByArea()[id]?.length || 0), 0)
    const ideal = FFT_LINE_IDS.reduce((s, id) => s + (getAreaStaffing(id).ideal || 0), 0)
    return { slot, real, ideal, extraNote: `${FFT_LINE_IDS.length} ${slot.subtitle}` }
  }
  if (slot.id === 'INSUMOS_SUMINISTRO') {
    // 2026-08-26: group-aware (PNP/POC/PEN + Box Prep + Insumos + Suministro
    // de material fusionados, catalog.js/AREA_DETAIL_GROUPS.INSUMOS) --
    // mismos numeros que el detalle real, ideal ya no es null (9).
    const staffing = getGroupAreaStaffing(operationalGroupMembers('INSUMOS'))
    return { slot, real: staffing.real, ideal: staffing.ideal, extraNote: slot.subtitle }
  }
  const staffing = getAreaStaffing(slot.id)
  return { slot, real: staffing.real, ideal: staffing.ideal, extraNote: slot.subtitle }
}

function normalize(text) {
  return text.toString().trim().toLowerCase()
}

export default function EstacionesTab({ onOpenLine, onGoToLineas }) {
  usePersonnelVersion()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [view, setView] = useState('tarjetas')

  const rows = useMemo(() => AREA_SLOTS.map(computeRow), [])

  const filteredRows = useMemo(
    () => rows.filter((r) => !query.trim() || normalize(r.slot.name).includes(normalize(query))),
    [rows, query],
  )
  const filteredPlaceholders = useMemo(
    () => PLACEHOLDER_SLOTS.filter((p) => !query.trim() || normalize(p.label).includes(normalize(query))),
    [query],
  )

  const totals = useMemo(() => {
    const totalReal = rows.reduce((s, r) => s + r.real, 0)
    const totalIdeal = rows.reduce((s, r) => s + (r.ideal || 0), 0)
    const faltante = Math.max(totalIdeal - totalReal, 0)
    const coverage = totalIdeal > 0 ? (totalReal / totalIdeal) * 100 : 0
    return { totalReal, totalIdeal, faltante, coverage, count: rows.length + PLACEHOLDER_SLOTS.length }
  }, [rows])

  function handleOpenRow(row) {
    if (row.slot.id === 'FFT') { onGoToLineas?.(); return }
    if (row.slot.id === 'INSUMOS_SUMINISTRO') { onOpenLine?.('INSUMOS'); return }
    onOpenLine?.(row.slot.id)
  }

  return (
    <Box>
      <Stack
        direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Estaciones del centro de trabajo</Typography>
            <Tooltip title="Todas las áreas del catálogo, agrupadas para consulta ejecutiva. El Conveyor y el plano físico se administran en Áreas de trabajo.">
              <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
            </Tooltip>
          </Stack>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
            Todas las áreas y estaciones operativas registradas
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Buscar área, estación o empleado..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
            <ToggleButton value="tarjetas" sx={{ textTransform: 'none', fontWeight: 700, px: 1.5, gap: 0.5 }}>
              <ViewModuleIcon sx={{ fontSize: 17 }} /> Tarjetas
            </ToggleButton>
            <ToggleButton value="lista" sx={{ textTransform: 'none', fontWeight: 700, px: 1.5, gap: 0.5 }}>
              <ViewListIcon sx={{ fontSize: 17 }} /> Lista
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {view === 'tarjetas' ? (
        <Box
          sx={{
            display: 'grid', gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
          }}
        >
          {filteredRows.map((row) => (
            <AreaCard key={row.slot.id} row={row} onClick={() => handleOpenRow(row)} />
          ))}
          {filteredPlaceholders.map((p) => (
            <PlaceholderCard key={p.key} placeholder={p} onAssign={() => navigate('/registro-personal')} />
          ))}
        </Box>
      ) : (
        <EstacionesListView rows={filteredRows} placeholders={filteredPlaceholders} onOpenRow={handleOpenRow} onAssign={() => navigate('/registro-personal')} />
      )}

      {filteredRows.length === 0 && filteredPlaceholders.length === 0 && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 4 }}>
          Ninguna área coincide con "{query}".
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

function AreaCard({ row, onClick }) {
  const { slot, real, ideal, extraNote } = row
  const statusKey = statusFor(real, ideal)
  const badge = badgeFor(real, ideal)
  const accent = colorForArea(slot.colorAreaId)
  const statusColor = statusKey ? STATUS_META[statusKey].color : '#94A3B8'
  const pct = ideal ? Math.min((real / ideal) * 100, 999) : null

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.75, borderRadius: '16px', cursor: 'pointer', userSelect: 'none',
        border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
        display: 'flex', flexDirection: 'column', gap: 1,
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(16,24,40,0.08)', borderColor: alpha('#3B82F6', 0.4) },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.25}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          bgcolor: alpha(accent, 0.12), color: accent, display: 'grid', placeItems: 'center',
          '& .MuiSvgIcon-root': { fontSize: 22 },
        }}>
          {slot.icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.25 }}>{slot.name}</Typography>
          {slot.badge && (
            <Chip size="small" label={slot.badge} sx={{ height: 18, fontSize: 9.5, fontWeight: 700, mt: 0.4, bgcolor: alpha(accent, 0.1), color: accent }} />
          )}
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
          {real} / {ideal != null ? ideal : '—'}
        </Typography>
        {badge && (
          <Chip
            size="small" label={badge.text}
            sx={{
              height: 20, fontSize: 10.5, fontWeight: 700,
              bgcolor: alpha(statusColor, 0.14), color: statusColor,
            }}
          />
        )}
      </Stack>

      {ideal != null ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flex: 1, height: 6, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box sx={{ width: `${Math.min(pct, 100)}%`, height: '100%', bgcolor: statusColor, borderRadius: 999 }} />
          </Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: statusColor, minWidth: 40, textAlign: 'right' }}>
            {pct.toFixed(1)}%
          </Typography>
        </Stack>
      ) : (
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontStyle: 'italic' }}>Sin plantilla definida</Typography>
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5, mt: 'auto', borderTop: '1px dashed', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 600 }}>{extraNote}</Typography>
        <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.disabled', transform: 'rotate(-90deg)' }} />
      </Stack>
    </Paper>
  )
}

function PlaceholderCard({ placeholder, onAssign }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.75, borderRadius: '16px', border: '1.5px dashed', borderColor: 'divider',
        display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start', bgcolor: 'action.hover',
      }}
    >
      <Box sx={{
        width: 44, height: 44, borderRadius: '50%', bgcolor: 'background.paper', color: 'text.disabled',
        display: 'grid', placeItems: 'center', border: '1px solid', borderColor: 'divider',
      }}>
        <AddCircleOutlineIcon sx={{ fontSize: 22 }} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>{placeholder.label}</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Sin personal asignado</Typography>
      <Button
        size="small" onClick={(e) => { e.stopPropagation(); onAssign() }}
        sx={{ textTransform: 'none', fontWeight: 700, p: 0, minWidth: 0, mt: 'auto' }}
      >
        Asignar personal
      </Button>
    </Paper>
  )
}

function EstacionesListView({ rows, placeholders, onOpenRow, onAssign }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Área</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Personal</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Estado</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', color: 'text.secondary' }}>Cobertura</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const statusKey = statusFor(row.real, row.ideal)
            const badge = badgeFor(row.real, row.ideal)
            const color = statusKey ? STATUS_META[statusKey].color : '#94A3B8'
            const pct = row.ideal ? Math.min((row.real / row.ideal) * 100, 999) : null
            return (
              <TableRow key={row.slot.id} hover onClick={() => onOpenRow(row)} sx={{ cursor: 'pointer', '&:last-of-type td': { borderBottom: placeholders.length ? undefined : 0 } }}>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{row.slot.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>{row.real} / {row.ideal != null ? row.ideal : '—'}</TableCell>
                <TableCell>
                  {badge && (
                    <Chip size="small" label={badge.text} sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(color, 0.14), color }} />
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 13, fontWeight: 700, color }}>{pct != null ? `${pct.toFixed(1)}%` : 'Sin plantilla'}</TableCell>
                <TableCell align="right"><ExpandMoreIcon sx={{ fontSize: 18, color: 'text.disabled', transform: 'rotate(-90deg)' }} /></TableCell>
              </TableRow>
            )
          })}
          {placeholders.map((p) => (
            <TableRow key={p.key} hover sx={{ '& td': { color: 'text.disabled' } }}>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#94A3B8', flexShrink: 0 }} />
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{p.label}</Typography>
                </Stack>
              </TableCell>
              <TableCell colSpan={3} sx={{ fontSize: 12.5, fontStyle: 'italic' }}>Sin personal asignado</TableCell>
              <TableCell align="right">
                <Button size="small" onClick={onAssign} sx={{ textTransform: 'none', fontWeight: 700 }}>Asignar personal</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}

function SummaryPanel({ totals }) {
  const items = [
    { label: 'Áreas totales', value: totals.count, icon: <PeopleAltIcon />, color: '#3B82F6' },
    { label: 'Personal asignado', value: totals.totalReal, icon: <GroupsIcon />, color: '#10B981' },
    { label: 'Plantilla ideal', value: totals.totalIdeal, icon: <Groups2Icon />, color: '#A855F7' },
    { label: 'Personal faltante', value: totals.faltante, icon: <PersonOffIcon />, color: '#EF4444' },
    { label: '% Cobertura general', value: `${totals.coverage.toFixed(1)}%`, icon: <DonutLargeIcon />, color: '#06B6D4' },
  ]
  return (
    <Paper elevation={0} sx={{ mt: 2.5, p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.75 }}>
            Leyenda de estado
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {Object.values(STATUS_META).map((meta) => (
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
                px: 1.5, py: 1, borderRadius: 2, minWidth: 140,
                border: '1px solid', borderColor: alpha(item.color, 0.2),
                bgcolor: (t) => alpha(item.color, t.palette.mode === 'dark' ? 0.08 : 0.05),
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                bgcolor: alpha(item.color, 0.14), color: item.color,
                display: 'grid', placeItems: 'center', '& .MuiSvgIcon-root': { fontSize: 16 },
              }}>
                {item.icon}
              </Box>
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.15 }}>{item.value}</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>{item.label}</Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  )
}
