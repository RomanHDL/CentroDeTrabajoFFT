import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { alpha } from '@mui/material/styles'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import BadgeIcon from '@mui/icons-material/Badge'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import HistoryIcon from '@mui/icons-material/History'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ContactsIcon from '@mui/icons-material/Contacts'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import BoltIcon from '@mui/icons-material/Bolt'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import GridViewIcon from '@mui/icons-material/GridView'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { WORK_CENTERS, SHIFT_OPTIONS, workCenterById } from '../../data/production/catalog'
import {
  getEffectiveTodayRoster,
  getEffectiveAreaForEmployee,
  AUTO_ACTIVE_AREAS,
} from '../../data/production/personnelByArea'
import { exportPersonalExcel } from '../../data/production/excelExport'
import {
  getMovesCountForDate,
  getPendingMoves,
  getAllEmployees,
  searchEmployees,
  getCurrentAssignment,
  getMovementsForEmployee,
  getUnassignedPresentToday,
  todayISO,
} from '../../data/personnel/repository'
import {
  approvePendingMoveWithToast,
  rejectPendingMoveWithToast,
} from '../../data/personnel/moveApprovalActions'
import { isEmployeeEligible } from '../../data/personnel/directory'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useRoleMode } from '../../state/roleMode'
import { useAuth } from '../../state/auth'
// Reutiliza la card KPI compacta y horizontal ya aprobada para el Dashboard
// (2026-08-24) -- mismo lenguaje visual pedido para Personal en este rediseño
// (2026-08-25), en vez de duplicar el componente.
import DashboardKpiCard from '../dashboard/DashboardKpiCard'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Rediseño 2026-08-25 (a peticion explicita del usuario, mockup
   proporcionado) -- EXCLUSIVO de "Centro de Trabajo > Personal".
   Antes era una sola tabla larga (pase de lista) + directorio debajo,
   sin KPIs ni panel lateral. Ahora: 4 KPIs, una barra de
   busqueda+filtros+acciones, y el contenido principal en dos columnas
   (izquierda ~70%: Registro de hoy + Directorio completo; derecha
   ~30%: Resumen por area + Alertas/pendientes + Acciones rapidas).

   NINGUNA fuente de datos nueva -- todo sigue viniendo exactamente de
   personnelByArea.js/repository.js, igual que antes de este cambio:
   - "Registro de hoy" = getEffectiveTodayRoster() (snapshot + real,
     misma funcion que ya alimentaba el pase de lista).
   - "Con numero de empleado" / "Proyectos" = el mismo Directorio
     completo (getAllEmployees + isEmployeeEligible, ya excluye
     bajas) que ya existia debajo -- las 2 KPI de arriba SOLO
     resumen esos mismos numeros, nunca inventan una poblacion nueva.
   - "Movimientos hoy" = getMovesCountForDate (igual que antes).
   - "Resumen por area" agrupa el mismo roster por areaId (nuevo
     calculo, pero misma fuente).
   - "Alertas" reutiliza getUnassignedPresentToday() (antes se
     mostraba como una lista de chips siempre visible; ahora vive
     como una alerta clickeable que filtra la tabla por Estado --
     ver nota en el reporte al usuario, es una consolidacion de UX,
     no una perdida de funcionalidad) + el propio roster filtrado por
     estado SNAPSHOT/sin estacion.
   - "Acciones rapidas": Asignar a linea y Mover personal abren el
     MISMO RegisterPersonnelDialog de siempre (su propio flujo ya
     distingue "registrar" de "mover" segun si el empleado ya tiene
     asignacion hoy -- CONFLICT step de RegisterPersonnelForm.jsx);
     Ver bajas / Ver layout general solo cambian de pestaña
     (onGoToBajas/onGoToAreas, mismo patron que onGoToLineas en
     EstacionesTab.jsx). */

// 'PENDIENTE' (BASE/SEM34 no confirmo numero real) y 'PROYECTO' (se
// registro sin numero desde Registro de Personal) son los dos valores
// que NO cuentan como numero de empleado real -- todo lo demas si.
const NO_REAL_NUMBER = new Set(['PENDIENTE', 'PROYECTO'])
function hasRealNumber(employeeNumber) {
  return !NO_REAL_NUMBER.has(employeeNumber)
}

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

const ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'REGISTRADO', label: 'Registrado hoy' },
  { value: 'SNAPSHOT', label: 'Por snapshot' },
  { value: 'SIN_ESTACION', label: 'Sin estación' },
  { value: 'SIN_ASIGNACION', label: 'Sin asignación' },
]

const ROSTER_PAGE_SIZE = 8
const DIRECTORY_PAGE_SIZE = 8
const AREA_SUMMARY_TOP_N = 5

export default function PersonalDeHoyTab({ onGoToBajas, onGoToAreas }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  // roleMode colapsa ADMINISTRADOR/SUPERVISOR/LIDER en un solo modo
  // "SUPERVISOR" (ver src/state/roleMode.jsx) — para el panel de
  // aprobacion necesitamos distinguir a un LIDER de verdad, asi que
  // usamos el rol real de la sesion, no roleMode.
  const { user } = useAuth()
  const canApproveMoves = user?.role === 'SUPERVISOR' || user?.role === 'ADMINISTRADOR'

  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('TODAS')
  const [shiftFilter, setShiftFilter] = useState('TODOS')
  const [estadoFilter, setEstadoFilter] = useState('TODOS')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const [historyEmployee, setHistoryEmployee] = useState(null)
  const [directoryTab, setDirectoryTab] = useState('CON_NUMERO')
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [showAllRoster, setShowAllRoster] = useState(false)
  const [showAllDirectory, setShowAllDirectory] = useState(false)

  const pendingMoves = useMemo(
    () => (canApproveMoves ? getPendingMoves() : []),
    [version, canApproveMoves],
  )

  function handleApproveMove(id) {
    approvePendingMoveWithToast(id, user?.id)
  }

  function handleRejectMove(id) {
    rejectPendingMoveWithToast(id, user?.id)
  }

  const roster = useMemo(() => getEffectiveTodayRoster(), [version])
  const presentToday = roster.length
  const movesToday = useMemo(() => getMovesCountForDate(todayISO()), [version])
  const unassigned = useMemo(() => getUnassignedPresentToday(), [version])
  const rosterSinEstacion = useMemo(() => roster.filter((r) => !r.stationId), [roster])
  const rosterSnapshot = useMemo(() => roster.filter((r) => r.source === 'SNAPSHOT'), [roster])

  // Directorio completo -- TODO el personal activo (elegible, sin
  // bajas), no solo quien tiene ubicacion hoy. Las 2 KPI de arriba
  // ("Con numero de empleado"/"Personal por proyecto") son
  // exactamente estos mismos dos conteos, para que nunca se
  // desincronicen con las tabs de abajo.
  const directoryAll = useMemo(() => getAllEmployees().filter(isEmployeeEligible), [version])
  const directoryWithNumber = useMemo(
    () =>
      directoryAll
        .filter((e) => hasRealNumber(e.employeeNumber))
        .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber, 'es', { numeric: true })),
    [directoryAll],
  )
  const directoryProyectos = useMemo(
    () =>
      directoryAll
        .filter((e) => !hasRealNumber(e.employeeNumber))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [directoryAll],
  )
  // % "respecto al personal correspondiente" (misma poblacion en
  // numerador y denominador, a proposito -- ver nota en el reporte al
  // usuario sobre por que NO se usa "personal presente hoy" aqui).
  const pctConNumero =
    directoryAll.length > 0 ? (directoryWithNumber.length / directoryAll.length) * 100 : 0

  const searchResults = useMemo(() => searchEmployees(query), [query, version])
  const bestMatch = useMemo(() => {
    if (!query.trim()) return null
    const exact = searchResults.find((e) => e.employeeNumber === query.trim())
    return exact || searchResults[0] || null
  }, [query, searchResults])

  const bestMatchDetail = useMemo(() => {
    if (!bestMatch) return null
    const assignment = getCurrentAssignment(bestMatch.id)
    const movements = getMovementsForEmployee(bestMatch.id, todayISO())
    const lastMove = movements.filter((m) => m.type === 'MOVE').slice(-1)[0]
    return { employee: bestMatch, assignment, lastMove }
  }, [bestMatch, version])

  const rosterRows = useMemo(() => {
    if (estadoFilter === 'SIN_ASIGNACION') {
      return unassigned.map((u) => ({
        id: u.id,
        employeeId: u.employeeId,
        employeeNumber: u.employeeNumber,
        employee: u.employee,
        areaId: null,
        stationId: null,
        checkInAt: u.checkedInAt || null,
        shift: u.shift || null,
        source: 'SIN_ASIGNACION',
      }))
    }
    return roster.filter((r) => {
      if (estadoFilter === 'REGISTRADO' && r.source !== 'REGISTRO') return false
      if (estadoFilter === 'SNAPSHOT' && r.source !== 'SNAPSHOT') return false
      if (estadoFilter === 'SIN_ESTACION' && r.stationId) return false
      return true
    })
  }, [roster, unassigned, estadoFilter])

  const queryNorm = query.trim().toLowerCase()
  const filteredRoster = useMemo(
    () =>
      rosterRows.filter((r) => {
        if (areaFilter !== 'TODAS' && r.areaId !== areaFilter) return false
        if (shiftFilter !== 'TODOS' && r.shift !== shiftFilter) return false
        if (queryNorm) {
          const num = (r.employeeNumber || '').toLowerCase()
          const name = (r.employee?.name || '').toLowerCase()
          if (!num.includes(queryNorm) && !name.includes(queryNorm)) return false
        }
        return true
      }),
    [rosterRows, areaFilter, shiftFilter, queryNorm],
  )

  const visibleRoster = showAllRoster ? filteredRoster : filteredRoster.slice(0, ROSTER_PAGE_SIZE)

  const directoryQueryNorm = directoryQuery.trim().toLowerCase()
  const filterDirectory = (list) => {
    if (!directoryQueryNorm) return list
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(directoryQueryNorm) ||
        e.employeeNumber.toLowerCase().includes(directoryQueryNorm),
    )
  }
  const directoryList =
    directoryTab === 'CON_NUMERO'
      ? filterDirectory(directoryWithNumber)
      : filterDirectory(directoryProyectos)
  const visibleDirectory = showAllDirectory
    ? directoryList
    : directoryList.slice(0, DIRECTORY_PAGE_SIZE)

  // Resumen por area -- Top N por personal presente hoy (roster
  // completo, sin filtros de la barra, para que sea una foto general
  // estable igual que las alertas). Participacion = presentesArea /
  // totalPresente * 100, nunca hardcodeada.
  const areaSummary = useMemo(() => {
    const counts = {}
    roster.forEach((r) => {
      counts[r.areaId] = (counts[r.areaId] || 0) + 1
    })
    return Object.entries(counts)
      .map(([areaId, count]) => ({
        areaId,
        count,
        pct: presentToday > 0 ? (count / presentToday) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, AREA_SUMMARY_TOP_N)
  }, [roster, presentToday])

  function handleAlertClick(estado) {
    setEstadoFilter(estado)
    setShowAllRoster(true)
  }

  return (
    <Box>
      {/* KPIs — exactamente 4 */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKpiCard
            icon={<PeopleAltIcon />}
            accent="#3B82F6"
            title="Personal presente hoy"
            subtitle="Registrados en la fecha"
            value={presentToday}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKpiCard
            icon={<BadgeIcon />}
            accent="#06B6D4"
            title="Con número de empleado"
            subtitle="Personal activo identificado"
            value={directoryWithNumber.length}
            unit={`· ${pctConNumero.toFixed(1)}% del personal activo`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKpiCard
            icon={<WorkOutlineIcon />}
            accent="#A855F7"
            title="Personal por proyecto"
            subtitle="Asignados a proyectos"
            value={directoryProyectos.length}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DashboardKpiCard
            icon={<SwapHorizIcon />}
            accent="#F59E0B"
            title="Movimientos hoy"
            subtitle="Altas, traslados o cambios"
            value={movesToday}
          />
        </Grid>
      </Grid>

      {/* Barra de busqueda + filtros + acciones */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: 1.5 }}>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1.25} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar empleado por nombre o número..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5, fontSize: 20 }} />,
            }}
            sx={{ ...ps.inputSx, minWidth: 260, flex: 1 }}
          />
          <TextField
            select
            size="small"
            label="Área"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 150 }}
          >
            <MenuItem value="TODAS">Todas</MenuItem>
            {WORK_CENTERS.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Turno"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 130 }}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            {SHIFT_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Estado"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 150 }}
          >
            {ESTADO_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          <Button
            variant="contained"
            startIcon={<PersonAddAlt1Icon />}
            onClick={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, flexShrink: 0 }}
          >
            {isSupervisor ? 'Registrar personal' : 'Registrarme / Autoasignarme'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportPersonalExcel(todayISO())}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, flexShrink: 0 }}
          >
            Exportar Excel
          </Button>
        </Stack>
      </Paper>

      {query.trim() && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: 2.5 }}>
          {bestMatchDetail ? (
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                  {bestMatchDetail.employee.employeeNumber} — {bestMatchDetail.employee.name}
                </Typography>
                <Button
                  size="small"
                  startIcon={<HistoryIcon />}
                  onClick={() => setHistoryEmployee(bestMatchDetail.employee)}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Ver historial de hoy
                </Button>
              </Stack>
              {bestMatchDetail.assignment ? (
                <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={1.5}>
                  <InfoField label="Estado" value="Presente" />
                  <InfoField
                    label="Ubicación actual"
                    value={areaLabel(bestMatchDetail.assignment.areaId)}
                  />
                  <InfoField label="Rol actual" value={bestMatchDetail.assignment.stationId} />
                  <InfoField label="Entrada" value={bestMatchDetail.assignment.checkInAt} />
                  {bestMatchDetail.lastMove && (
                    <InfoField
                      label="Último movimiento"
                      value={`${areaLabel(bestMatchDetail.lastMove.fromAreaId)} → ${areaLabel(bestMatchDetail.lastMove.toAreaId)} · ${bestMatchDetail.lastMove.movedAt}`}
                    />
                  )}
                </Stack>
              ) : (
                <Typography sx={ps.emptyText}>No registrado hoy.</Typography>
              )}
            </Stack>
          ) : (
            <Typography sx={ps.emptyText}>
              No se encontró ningún empleado para "{query}".
            </Typography>
          )}
        </Paper>
      )}

      {/* Movimientos pendientes de aprobacion — solo SUPERVISOR/ADMINISTRADOR
          (nunca LIDER: es justo lo que un lider pide y espera a que se
          verifique aqui, peticion explicita del usuario). Funcionalidad sin
          cambios, solo se conserva arriba del contenido de dos columnas. */}
      {canApproveMoves && pendingMoves.length > 0 && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
          <Box sx={ps.cardHeader}>
            <Typography sx={ps.cardHeaderTitle}>
              Movimientos pendientes de aprobación ({pendingMoves.length})
            </Typography>
            <Typography sx={ps.cardHeaderSubtitle}>
              Pedidos por líderes — verifica antes de aplicarlos
            </Typography>
          </Box>
          <Stack spacing={1} sx={{ p: 2 }}>
            {pendingMoves.map((m) => (
              <Stack
                key={m.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                    {m.employeeNumber} — {m.employeeName}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {areaLabel(m.fromAreaId)} → {areaLabel(m.toAreaId)} · {m.toStationId} · pedido
                    por {m.requestedByName || 'un líder'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<CloseIcon fontSize="small" />}
                    onClick={() => handleRejectMove(m.id)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CheckIcon fontSize="small" />}
                    onClick={() => handleApproveMove(m.id)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Aprobar
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Contenido principal — dos columnas (70/30 en desktop) */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8} lg={8.4} sx={{ minWidth: 0 }}>
          <RegistroDeHoyCard
            rows={visibleRoster}
            total={filteredRoster.length}
            allCount={roster.length}
            showAll={showAllRoster}
            onToggleShowAll={() => setShowAllRoster((v) => !v)}
            onRowClick={setHistoryEmployee}
          />
          <DirectorioCard
            tab={directoryTab}
            onTabChange={setDirectoryTab}
            withNumberCount={directoryWithNumber.length}
            proyectosCount={directoryProyectos.length}
            query={directoryQuery}
            onQueryChange={setDirectoryQuery}
            rows={visibleDirectory}
            total={directoryList.length}
            showAll={showAllDirectory}
            onToggleShowAll={() => setShowAllDirectory((v) => !v)}
            onRowClick={setHistoryEmployee}
          />
        </Grid>

        <Grid item xs={12} md={4} lg={3.6} sx={{ minWidth: 0 }}>
          <Stack spacing={2}>
            <ResumenPorAreaCard
              areas={areaSummary}
              totalPresente={presentToday}
              onAreaClick={(id) => setAreaFilter(id)}
            />
            <AlertasCard
              sinEstacion={rosterSinEstacion.length}
              snapshot={rosterSnapshot.length}
              movimientos={movesToday}
              onClickSinEstacion={() => handleAlertClick('SIN_ESTACION')}
              onClickSnapshot={() => handleAlertClick('SNAPSHOT')}
              onClickMovimientos={() => handleAlertClick('REGISTRADO')}
            />
            <AccionesRapidasCard
              onAsignar={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
              onMover={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
              onVerBajas={onGoToBajas}
              onVerLayout={onGoToAreas}
            />
          </Stack>
        </Grid>
      </Grid>

      <RegisterPersonnelDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onDone={() => {}}
      />
      <SelfAssignDialog
        open={selfAssignOpen}
        onClose={() => setSelfAssignOpen(false)}
        onDone={() => {}}
      />
      <EmployeeHistoryDialog
        employee={historyEmployee}
        open={Boolean(historyEmployee)}
        onClose={() => setHistoryEmployee(null)}
        onChanged={() => {}}
      />
    </Box>
  )
}

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 700,
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mt: 0.25 }}>{value}</Typography>
    </Box>
  )
}

/* Card "Registro de hoy" -- misma tabla/datos que antes (pase de
   lista), ahora en una card con titulo propio, contador arriba a la
   derecha, altura controlada (ROSTER_PAGE_SIZE filas por defecto) y
   "Ver todos los registros" para expandir -- nunca fuerza scroll de
   cientos de filas para llegar al siguiente bloque. */
function RegistroDeHoyCard({ rows, total, allCount, showAll, onToggleShowAll, onRowClick }) {
  const ps = usePageStyles()
  return (
    <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
      <Box sx={{ ...ps.cardHeader, justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Box>
            <Typography sx={ps.cardHeaderTitle}>Registro de hoy</Typography>
            <Typography sx={ps.cardHeaderSubtitle}>
              Pase de lista efectivo — snapshot histórico + asignaciones reales del día
            </Typography>
          </Box>
        </Stack>
        <Chip
          size="small"
          label={`${allCount} registrados hoy`}
          sx={{ ...ps.metricChip('info'), flexShrink: 0 }}
        />
      </Box>
      <TableContainer sx={{ maxHeight: showAll ? 480 : 'none', overflowX: 'auto' }}>
        <Table size="small" stickyHeader={showAll}>
          <TableHead>
            <TableRow sx={ps.tableHeaderRow}>
              <TableCell>Empleado</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Área actual</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Entrada</TableCell>
              <TableCell>Turno</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, idx) => {
              // Areas fijas de soporte (Capacitacion, Team Leader, Soporte,
              // Limpieza, Gerente, Supervisor -- NUNCA Calidad, a peticion
              // explicita del usuario 2026-08-24): se muestran ya activas a
              // las 7am aunque nadie las haya registrado hoy a mano. Es
              // puramente visual -- no crea ningun checkin/asignacion real.
              const showAsAutoActive =
                r.source === 'SNAPSHOT' && AUTO_ACTIVE_AREAS.includes(r.areaId)
              const displayCheckIn = showAsAutoActive ? '07:00' : r.checkInAt || '—'
              return (
                <TableRow
                  key={r.id}
                  sx={ps.tableRow(idx)}
                  hover
                  onClick={() => onRowClick(r.employee)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>
                    {r.employeeNumber}
                  </TableCell>
                  <TableCell sx={ps.cellText}>{r.employee?.name || '—'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{areaLabel(r.areaId) || '—'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.stationId || 'Sin estación'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{displayCheckIn}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.shift || '—'}</TableCell>
                  <TableCell>
                    {r.source === 'SIN_ASIGNACION' ? (
                      <Chip size="small" label="Sin asignación" sx={ps.statusChip('CANCELADA')} />
                    ) : r.source === 'SNAPSHOT' && !showAsAutoActive ? (
                      <Chip size="small" label="Por snapshot" sx={ps.statusChip('PENDIENTE')} />
                    ) : (
                      <Chip size="small" label="Registrado hoy" sx={ps.statusChip('COMPLETADA')} />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    compact
                    title="Nadie coincide con los filtros actuales"
                    description="Ajusta la búsqueda, área, turno o estado."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {total > 0 && (
        <Box sx={{ p: 1.25, textAlign: 'right', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            size="small"
            endIcon={<ChevronRightIcon fontSize="small" />}
            onClick={onToggleShowAll}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {showAll ? 'Ver menos' : `Ver todos los registros (${total})`}
          </Button>
        </Box>
      )}
    </Paper>
  )
}

/* Card "Directorio completo de personal" -- mismas 2 tabs/datos de
   siempre (Con número de empleado / Proyectos), ahora con altura
   controlada + "Ver directorio completo" para expandir. */
function DirectorioCard({
  tab,
  onTabChange,
  withNumberCount,
  proyectosCount,
  query,
  onQueryChange,
  rows,
  total,
  showAll,
  onToggleShowAll,
  onRowClick,
}) {
  const ps = usePageStyles()
  return (
    <Paper elevation={0} sx={{ ...ps.card }}>
      <Box sx={ps.cardHeader}>
        <ContactsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Box>
          <Typography sx={ps.cardHeaderTitle}>Directorio completo de personal</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>
            Todo el personal, persona por persona — con número de empleado o como Proyecto
          </Typography>
        </Box>
      </Box>
      <Box sx={{ px: 2.5, pt: 2 }}>
        <Tabs value={tab} onChange={(_, v) => onTabChange(v)} sx={{ minHeight: 36 }}>
          <Tab
            value="CON_NUMERO"
            label={`Con número de empleado (${withNumberCount})`}
            sx={{ minHeight: 36, textTransform: 'none', fontWeight: 700 }}
          />
          <Tab
            value="PROYECTOS"
            label={`Proyectos (${proyectosCount})`}
            sx={{ minHeight: 36, textTransform: 'none', fontWeight: 700 }}
          />
        </Tabs>
      </Box>
      <Box sx={{ px: 2.5, pt: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar por nombre o número..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5, fontSize: 20 }} /> }}
          sx={ps.inputSx}
        />
      </Box>
      <TableContainer sx={{ maxHeight: showAll ? 480 : 'none', mt: 1, overflowX: 'auto' }}>
        <Table size="small" stickyHeader={showAll}>
          <TableHead>
            <TableRow sx={ps.tableHeaderRow}>
              <TableCell>Empleado</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Área actual</TableCell>
              <TableCell>Fecha de ingreso</TableCell>
              {tab === 'PROYECTOS' && <TableCell>Tipo</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((e, idx) => (
              <TableRow
                key={e.id}
                sx={ps.tableRow(idx)}
                hover
                onClick={() => onRowClick(e)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>
                  {hasRealNumber(e.employeeNumber) ? e.employeeNumber : '—'}
                </TableCell>
                <TableCell sx={ps.cellText}>{e.name}</TableCell>
                <TableCell sx={ps.cellTextSecondary}>
                  {areaLabel(getEffectiveAreaForEmployee(e.id)) || '—'}
                </TableCell>
                <TableCell sx={ps.cellTextSecondary}>{e.fechaIngreso || '—'}</TableCell>
                {tab === 'PROYECTOS' && (
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        e.employeeNumber === 'PROYECTO'
                          ? 'Registrado como Proyecto'
                          : 'Sin número confirmado'
                      }
                      sx={ps.statusChip('PENDIENTE')}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={tab === 'PROYECTOS' ? 5 : 4}>
                  <EmptyState
                    compact
                    title="Sin resultados"
                    description="Nadie coincide con esta búsqueda."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {total > 0 && (
        <Box sx={{ p: 1.25, textAlign: 'right', borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            size="small"
            endIcon={<ChevronRightIcon fontSize="small" />}
            onClick={onToggleShowAll}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {showAll ? 'Ver menos' : `Ver directorio completo (${total})`}
          </Button>
        </Box>
      )}
    </Paper>
  )
}

/* Panel derecho 1/3 -- "Resumen por area": Top N por personal
   presente hoy, con barra de participacion. SOLO referencia visual
   del roster completo (sin filtros de la barra) para que sea estable
   -- clic en una fila aplica ese filtro de Area a la tabla principal. */
function ResumenPorAreaCard({ areas, totalPresente, onAreaClick }) {
  const ps = usePageStyles()
  return (
    <Paper elevation={0} sx={ps.card}>
      <Box sx={ps.cardHeader}>
        <Typography sx={ps.cardHeaderTitle}>Resumen por área</Typography>
        <Typography sx={ps.cardHeaderSubtitle}>Dónde está el personal presente hoy</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {areas.length === 0 ? (
          <Typography sx={ps.emptyText}>Sin personal presente hoy.</Typography>
        ) : (
          <Stack spacing={1.25}>
            {areas.map((a) => (
              <Box
                key={a.areaId}
                onClick={() => onAreaClick(a.areaId)}
                sx={{ cursor: 'pointer', '&:hover .bar-fill': { opacity: 0.85 } }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }} noWrap>
                    {areaLabel(a.areaId)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: 'text.secondary',
                      flexShrink: 0,
                      ml: 1,
                    }}
                  >
                    {a.count} · {a.pct.toFixed(1)}%
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    mt: 0.4,
                    height: 6,
                    borderRadius: 999,
                    bgcolor: 'action.hover',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    className="bar-fill"
                    sx={{
                      width: `${Math.min(a.pct, 100)}%`,
                      height: '100%',
                      bgcolor: '#3B82F6',
                      borderRadius: 999,
                      transition: 'opacity .15s ease',
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ mt: 2, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
            Total presente
          </Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{totalPresente}</Typography>
        </Stack>
      </Box>
    </Paper>
  )
}

/* Panel derecho 2/3 -- "Alertas / pendientes": 3 renglones reales,
   clickeables, cada uno aplica el filtro de Estado correspondiente en
   la tabla principal (Registro de hoy) -- nunca inventa un numero, si
   algo no aplica se veria en 0, no "Sin datos" ficticio (aqui las 3
   metricas siempre son calculables desde el roster real). */
function AlertasCard({
  sinEstacion,
  snapshot,
  movimientos,
  onClickSinEstacion,
  onClickSnapshot,
  onClickMovimientos,
}) {
  const ps = usePageStyles()
  const rows = [
    {
      label: 'Empleados sin estación asignada',
      value: sinEstacion,
      onClick: onClickSinEstacion,
      color: '#F59E0B',
    },
    {
      label: 'Pendientes por registrar (snapshot)',
      value: snapshot,
      onClick: onClickSnapshot,
      color: '#F59E0B',
    },
    {
      label: 'Movimientos recientes hoy',
      value: movimientos,
      onClick: onClickMovimientos,
      color: '#3B82F6',
    },
  ]
  return (
    <Paper elevation={0} sx={ps.card}>
      <Box sx={ps.cardHeader}>
        <WarningAmberIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
        <Typography sx={ps.cardHeaderTitle}>Alertas / pendientes</Typography>
      </Box>
      <Stack sx={{ p: 1 }}>
        {rows.map((row) => (
          <Stack
            key={row.label}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            onClick={row.onClick}
            sx={{
              p: 1.25,
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>
              {row.label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: row.color }}>
                {row.value}
              </Typography>
              <ChevronRightIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Stack>
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

/* Panel derecho 3/3 -- "Acciones rapidas": cuadricula 2x2. Asignar a
   linea / Mover personal reutilizan el mismo RegisterPersonnelDialog
   de siempre (su propio flujo ya distingue registrar de mover); Ver
   bajas / Ver layout general solo cambian de pestaña. */
function AccionesRapidasCard({ onAsignar, onMover, onVerBajas, onVerLayout }) {
  const ps = usePageStyles()
  const actions = [
    { label: 'Asignar a línea', icon: <PersonAddAlt1Icon />, color: '#3B82F6', onClick: onAsignar },
    { label: 'Mover personal', icon: <SwapHorizIcon />, color: '#10B981', onClick: onMover },
    { label: 'Ver bajas', icon: <PersonOffIcon />, color: '#EF4444', onClick: onVerBajas },
    { label: 'Ver layout general', icon: <GridViewIcon />, color: '#3B82F6', onClick: onVerLayout },
  ]
  return (
    <Paper elevation={0} sx={ps.card}>
      <Box sx={ps.cardHeader}>
        <BoltIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography sx={ps.cardHeaderTitle}>Acciones rápidas</Typography>
      </Box>
      <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
        {actions.map((a) => (
          <Box
            key={a.label}
            onClick={a.onClick}
            sx={{
              p: 1.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              cursor: a.onClick ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              alignItems: 'flex-start',
              bgcolor: (t) => alpha(a.color, t.palette.mode === 'dark' ? 0.05 : 0.03),
              transition: 'all .15s ease',
              '&:hover': a.onClick
                ? {
                    borderColor: a.color,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${alpha(a.color, 0.15)}`,
                  }
                : {},
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: alpha(a.color, 0.14),
                color: a.color,
                display: 'grid',
                placeItems: 'center',
                '& .MuiSvgIcon-root': { fontSize: 17 },
              }}
            >
              {a.icon}
            </Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.2 }}>
              {a.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}
