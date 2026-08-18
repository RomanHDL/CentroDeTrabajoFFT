import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import { usePageStyles } from '../../ui/pageStyles'
import { WORK_CENTERS } from '../../data/production/catalog'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import { getLineWorkstationsWithOccupancy } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'

/* Estaciones/puestos configurados por area — la capacidad viene de
   workstations.js (configuracion, no del personal actual). La
   ocupacion (cuantas estan ocupadas hoy) si depende de asignaciones
   reales, que hoy empiezan vacias hasta que exista un check-in. */
export default function EstacionesTab({ onOpenLine }) {
  const version = usePersonnelVersion()
  const ps = usePageStyles()

  const rows = useMemo(() => WORK_CENTERS.map((area) => {
    const stations = getWorkstationsForLine(area.id)
    const withOccupancy = getLineWorkstationsWithOccupancy(area.id)
    const occupied = withOccupancy.filter((w) => w.occupants?.length > 0).length
    return { area, capacity: stations.length, occupied }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [version])

  return (
    <Paper elevation={0} sx={ps.card}>
      <Table size="small">
        <TableHead>
          <TableRow sx={ps.tableHeaderRow}>
            <TableCell>Área</TableCell>
            <TableCell align="right">Estaciones configuradas</TableCell>
            <TableCell align="right">Ocupadas hoy</TableCell>
            <TableCell align="right">Disponibles</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ area, capacity, occupied }, idx) => (
            <TableRow
              key={area.id} sx={{ ...ps.tableRow(idx), cursor: 'pointer' }} hover
              onClick={() => onOpenLine?.(area.id)}
            >
              <TableCell sx={{ ...ps.cellText, fontWeight: 600 }}>{area.name}</TableCell>
              <TableCell align="right" sx={ps.cellText}>{capacity}</TableCell>
              <TableCell align="right">
                <Chip size="small" label={occupied} sx={{ height: 20, fontWeight: 700 }} />
              </TableCell>
              <TableCell align="right" sx={ps.cellTextSecondary}>{capacity - occupied}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}
