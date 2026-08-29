import React, { useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import dayjs from 'dayjs'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { workCenterById } from '../../data/production/catalog'
import {
  getMovementsForEmployee,
  getAssignmentHistory,
  getCurrentAssignment,
  getSkillsForEmployee,
  releaseAssignment,
  todayISO,
} from '../../data/personnel/repository'
import { useRoleMode } from '../../state/roleMode'
import EmployeeAvatar from './EmployeeAvatar'
import MoveConfirmDialog from './MoveConfirmDialog'

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

const MOVEMENT_LABEL = { CHECK_IN: 'Entrada', MOVE: 'Movimiento', RELEASE: 'Puesto liberado' }

export default function EmployeeHistoryDialog({ employee, open, onClose, onChanged }) {
  const ps = usePageStyles()
  const { isSupervisor } = useRoleMode()
  const today = todayISO()
  const [moveOpen, setMoveOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  const currentAssignment = useMemo(
    () => (employee ? getCurrentAssignment(employee.id) : null),
    [employee, open, feedback],
  )
  const skills = useMemo(
    () => (employee ? getSkillsForEmployee(employee.id) : []),
    [employee, open],
  )
  const todaysMovements = useMemo(
    () => (employee ? getMovementsForEmployee(employee.id, today) : []),
    [employee, today, open, feedback],
  )
  const pastAssignments = useMemo(
    () => (employee ? getAssignmentHistory(employee.id).filter((a) => a.date !== today) : []),
    [employee, today, open],
  )

  if (!employee) return null

  const handleRelease = () => {
    const res = releaseAssignment(employee.id)
    if (res.status === 'OK') {
      setFeedback('Puesto liberado. El empleado sigue presente hoy, sin asignación.')
      onChanged && onChanged()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <EmployeeAvatar employee={employee} size={44} />
        <Box>
          <Typography sx={{ fontWeight: 800 }}>
            {employee.employeeNumber} — {employee.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {currentAssignment
              ? `${areaLabel(currentAssignment.areaId)} · ${currentAssignment.stationId}`
              : 'Sin asignación actual'}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {feedback && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setFeedback('')}>
            {feedback}
          </Alert>
        )}

        {currentAssignment && (
          <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={1} sx={{ mb: 2 }}>
            <Box>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                }}
              >
                Ubicación actual
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {areaLabel(currentAssignment.areaId)} · {currentAssignment.stationId}
              </Typography>
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                }}
              >
                Entrada
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>{currentAssignment.checkInAt}</Typography>
            </Box>
          </Stack>
        )}

        <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1 }}>Habilidades</Typography>
        {skills.length === 0 ? (
          <Typography sx={{ ...ps.emptyText, py: 1.5, textAlign: 'left' }}>
            Sin habilidades registradas todavía.
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75} sx={{ mb: 2 }}>
            {skills.map((s) => (
              <Chip key={s.id} size="small" label={s.stationName} sx={ps.metricChip('info')} />
            ))}
          </Stack>
        )}

        <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1, mt: 2 }}>
          Historial hoy
        </Typography>
        {todaysMovements.length === 0 ? (
          <EmptyState
            compact
            title="Sin movimientos hoy"
            description="Este empleado no se ha registrado hoy."
          />
        ) : (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {todaysMovements.map((m) => (
              <Box
                key={m.id}
                sx={{ display: 'flex', gap: 1.5, p: 1.1, borderRadius: 2, bgcolor: 'action.hover' }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 13, minWidth: 44 }}>
                  {m.movedAt}
                </Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                    {MOVEMENT_LABEL[m.type] || m.type}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    {m.fromAreaId
                      ? `${areaLabel(m.fromAreaId)} / ${m.fromStationId} → ${m.toAreaId ? `${areaLabel(m.toAreaId)} / ${m.toStationId}` : 'sin asignación'}`
                      : `${areaLabel(m.toAreaId)} · ${m.toStationId}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}

        <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1, mt: 2 }}>
          Días anteriores
        </Typography>
        {pastAssignments.length === 0 ? (
          <EmptyState
            compact
            title="Sin historial previo"
            description="No hay asignaciones registradas en días anteriores."
          />
        ) : (
          <Stack spacing={1}>
            {pastAssignments.map((a) => (
              <Box
                key={a.id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 1.1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 13, minWidth: 60 }}>
                  {dayjs(a.date).format('DD/MM')}
                </Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                    {areaLabel(a.areaId)}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    {a.stationId}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
        {isSupervisor && currentAssignment && (
          <>
            <Button
              color="error"
              onClick={handleRelease}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Liberar asignación
            </Button>
            <Button
              variant="outlined"
              onClick={() => setMoveOpen(true)}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Mover empleado
            </Button>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>

      <MoveConfirmDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        employee={employee}
        currentAssignment={currentAssignment}
        onDone={() => {
          setFeedback('Empleado movido correctamente.')
          onChanged && onChanged()
        }}
      />
    </Dialog>
  )
}
