import React from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { usePageStyles } from '../../ui/pageStyles'
import { workCenterById } from '../../data/production/catalog'
import { getSkillsForEmployee } from '../../data/personnel/repository'
import EmployeeAvatar from './EmployeeAvatar'

export default function SuggestedEmployeeCard({ candidate, onAssign, disabled }) {
  const ps = usePageStyles()
  const skills = getSkillsForEmployee(candidate.employee.id)

  const statusLabel = !candidate.present
    ? 'No registrado hoy'
    : candidate.assignment
      ? `Asignado en ${workCenterById(candidate.assignment.areaId)?.name || candidate.assignment.areaId}`
      : 'Disponible'

  const statusTone = !candidate.present ? 'default' : candidate.assignment ? 'warn' : 'ok'

  return (
    <Paper elevation={0} sx={{ ...ps.card, p: 1.5 }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <EmployeeAvatar employee={candidate.employee} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>
            {candidate.employee.employeeNumber} — {candidate.employee.name}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
            {skills.map((s) => s.stationName).join(' · ')}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }}>
            <Chip size="small" label={statusLabel} sx={ps.metricChip(statusTone)} />
          </Stack>
        </Box>
        <Button
          size="small"
          variant="contained"
          disabled={disabled}
          onClick={() => onAssign(candidate)}
          sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
        >
          Asignar
        </Button>
      </Stack>
    </Paper>
  )
}
