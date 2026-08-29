import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import GroupsIcon from '@mui/icons-material/Groups'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { workCenterById, hasLineStations } from '../../data/production/catalog'
import { getPeopleByArea, getFftPeopleWithLine, getAreaStaffing } from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'

function StaffingLine({ staffing }) {
  if (staffing.ideal == null) {
    return <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>Sin plantilla definida</Typography>
  }
  const complete = staffing.status === 'COMPLETA'
  const missing = staffing.ideal - staffing.real
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
      <Chip
        size="small"
        label={`${staffing.real} / ${staffing.ideal}`}
        sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: complete ? '#10B98122' : '#EF444422', color: complete ? '#047857' : '#B91C1C' }}
      />
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: complete ? '#10B981' : '#EF4444' }}>
        {complete ? 'Completa' : missing === 1 ? 'Falta 1' : `Faltan ${missing}`}
      </Typography>
    </Stack>
  )
}

const SAMPLE_LIMIT = 8

function StatusChip({ hasPeople }) {
  return (
    <Chip
      size="small"
      label={hasPeople ? 'Con personal' : 'Sin personal hoy'}
      sx={{
        fontWeight: 700,
        bgcolor: hasPeople ? '#10B98122' : '#94A3B822',
        color: hasPeople ? '#10B981' : '#64748B',
        border: `1px solid ${hasPeople ? '#10B98155' : '#94A3B855'}`,
      }}
    />
  )
}

function PendingEmployeeNumberNote() {
  return (
    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 2, lineHeight: 1.5 }}>
      Números de empleado pendientes: BASE todavía no incluye esa columna.
    </Typography>
  )
}

function PersonRow({ person, secondary, onClickSecondary }) {
  return (
    <DraggablePersonChip employeeId={person.id}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <EmployeeAvatar employee={{ name: person.name }} size={32} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: 13 }}>{person.name}</Typography>
        </Box>
        {secondary && (
          <Chip
            size="small"
            label={secondary}
            onClick={(e) => { e.stopPropagation(); onClickSecondary?.() }}
            sx={{ height: 20, fontSize: 10, cursor: onClickSecondary ? 'pointer' : 'default' }}
          />
        )}
      </Stack>
    </DraggablePersonChip>
  )
}

/* ─────────────────────────────────────────────
   Panel de detalle de la pestaña "Areas de trabajo" — se muestra
   inline en desktop/tablet (columna derecha) y dentro de un Drawer
   inferior en movil. NO duplica al LineDetailDrawer operativo (con
   estaciones, registrar personal, mover personal, etc): ese sigue
   siendo la vista de gestion completa, a la que este panel enlaza
   via "Ver gestion completa".
   ───────────────────────────────────────────── */
export default function AreaDetailPanel({ selection, onSelectArea, onOpenFullDrawer }) {
  const ps = usePageStyles()
  usePersonnelVersion()
  const [showAllFft, setShowAllFft] = useState(false)
  const [showAllPeople, setShowAllPeople] = useState(false)

  if (!selection) {
    return (
      <Box sx={{ p: 2.5 }}>
        <EmptyState compact title="Selecciona un área" description="Haz click en cualquier zona del layout para ver quién trabaja ahí." />
      </Box>
    )
  }

  if (selection.type === 'empty') {
    return (
      <Box sx={{ p: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 17, mb: 1.5 }}>{selection.label}</Typography>
        <EmptyState
          compact
          title="Sin datos de personal todavía"
          description="Esta zona aparece en el plano real, pero todavía no hay una fuente de personal conectada a ella."
        />
      </Box>
    )
  }

  if (selection.type === 'zoneGroup') {
    const people = getFftPeopleWithLine()
    const visible = showAllFft ? people : people.slice(0, SAMPLE_LIMIT)
    const idealSum = selection.areaIds.reduce((s, id) => s + (workCenterById(id)?.idealHeadcount ?? 0), 0)
    const fftComplete = people.length >= idealSum
    const fftMissing = idealSum - people.length
    return (
      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{selection.label}</Typography>
          <StatusChip hasPeople={people.length > 0} />
        </Stack>

        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Total de personas
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
          <GroupsIcon sx={{ color: '#3B82F6' }} />
          <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{people.length} personas</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Chip
            size="small"
            label={`${people.length} / ${idealSum}`}
            sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: fftComplete ? '#10B98122' : '#EF444422', color: fftComplete ? '#047857' : '#B91C1C' }}
          />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: fftComplete ? '#10B981' : '#EF4444' }}>
            {fftComplete ? 'Completa' : fftMissing === 1 ? 'Falta 1' : `Faltan ${fftMissing}`}
          </Typography>
        </Stack>

        <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1 }}>Líneas ({selection.areaIds.length})</Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {selection.areaIds.map((id) => {
            const staffing = getAreaStaffing(id)
            const line = workCenterById(id)
            return (
              <Grid item xs={6} key={id}>
                <Box
                  onClick={() => onSelectArea(id)}
                  sx={{
                    cursor: 'pointer', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
                    transition: 'border-color .15s ease', '&:hover': { borderColor: '#3B82F6' },
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{line?.name}</Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: staffing.status === 'COMPLETA' ? '#10B981' : '#EF4444' }}>
                    {staffing.real} / {staffing.ideal}
                  </Typography>
                </Box>
              </Grid>
            )
          })}
        </Grid>

        <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1 }}>
          Personal asignado {showAllFft ? '' : '(muestra)'}
        </Typography>
        {people.length === 0 ? (
          <EmptyState compact title="Sin personal en el Excel para FFT" />
        ) : (
          <Stack spacing={1.25}>
            {visible.map((p) => (
              <PersonRow key={p.id} person={p} secondary={p.lineName} onClickSecondary={() => onSelectArea(p.lineId)} />
            ))}
          </Stack>
        )}
        {people.length > SAMPLE_LIMIT && (
          <Button size="small" onClick={() => setShowAllFft((v) => !v)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
            {showAllFft ? 'Ver menos' : `Ver todo el personal (${people.length})`}
          </Button>
        )}

        <Divider sx={{ my: 2 }} />
        <PendingEmployeeNumberNote />
      </Box>
    )
  }

  const area = workCenterById(selection.id)
  if (!area) return null
  const isLine = hasLineStations(area.id)
  const people = getPeopleByArea()[selection.id] || []
  const visible = showAllPeople ? people : people.slice(0, SAMPLE_LIMIT)
  const staffing = getAreaStaffing(area.id)

  return (
    <Box sx={{ p: 2.5 }}>
      {isLine && (
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mb: 0.5 }}>
          <Typography
            onClick={() => onSelectArea('__FFT__')}
            sx={{ fontSize: 11.5, color: 'text.secondary', fontWeight: 700, cursor: 'pointer', '&:hover': { color: '#3B82F6' } }}
          >
            FFT
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        </Stack>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{area.name}</Typography>
        <StatusChip hasPeople={people.length > 0} />
      </Stack>

      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Total de personas
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25, mb: 1 }}>
        <GroupsIcon sx={{ color: '#3B82F6' }} />
        <Typography sx={{ fontWeight: 800, fontSize: 22 }}>{people.length} personas</Typography>
      </Stack>
      <StaffingLine staffing={staffing} />

      <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1 }}>Personal asignado</Typography>
      {people.length === 0 ? (
        <EmptyState compact title="Sin personal en el Excel para esta área" />
      ) : (
        <Stack spacing={1.25}>
          {visible.map((p) => <PersonRow key={p.id} person={p} />)}
        </Stack>
      )}
      {people.length > SAMPLE_LIMIT && (
        <Button size="small" onClick={() => setShowAllPeople((v) => !v)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
          {showAllPeople ? 'Ver menos' : `Ver todo el personal (${people.length})`}
        </Button>
      )}

      <Button
        variant="outlined"
        fullWidth
        onClick={() => onOpenFullDrawer(area.id)}
        sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
      >
        Asignar empleado
      </Button>

      <Divider sx={{ my: 2 }} />
      <PendingEmployeeNumberNote />
    </Box>
  )
}
