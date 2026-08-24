import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import SearchIcon from '@mui/icons-material/Search'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { getBajaEmployees } from '../../data/personnel/repository'

/* Personal ya no asignable (2026-08-24, a peticion explicita del
   usuario): las 8 personas marcadas status "BAJA" en
   realPersonnelSnapshot.js -- antes simplemente no aparecian en
   ningun lado (ni layout, ni busqueda, ni aqui); ahora tienen esta
   pestaña de solo lectura para que quede documentado que existen y
   por que ya no se les puede asignar. getAssignableEmployees()/
   searchEmployees() ya las excluye automaticamente via el campo
   `eligible` de directory.js -- esta pestaña NO cambia esa exclusion,
   solo la hace visible en vez de silenciosa. Nunca se ofrece
   asignar/mover/registrar desde aqui. */
export default function BajasTab() {
  const ps = usePageStyles()
  const [query, setQuery] = useState('')

  const baja = useMemo(() => getBajaEmployees(), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return baja
    return baja.filter((e) => e.name.toLowerCase().includes(q) || e.employeeNumber.toLowerCase().includes(q))
  }, [baja, query])

  return (
    <Paper elevation={0} sx={{ ...ps.card, mt: 2 }}>
      <Box sx={ps.cardHeader}>
        <Typography sx={ps.cardHeaderTitle}>Personal no asignable</Typography>
        <Typography sx={ps.cardHeaderSubtitle}>
          Personal marcado como baja — no se puede registrar, mover ni asignar a ninguna estación
        </Typography>
      </Box>
      <Box sx={{ px: 2.5, pt: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Buscar por nombre o número..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5, fontSize: 20 }} /> }}
          sx={ps.inputSx}
        />
      </Box>
      <TableContainer sx={{ maxHeight: 560, mt: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={ps.tableHeaderRow}>
              <TableCell>Empleado</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Última área/puesto conocido</TableCell>
              <TableCell>Fecha de ingreso</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((e, idx) => (
              <TableRow key={e.id} sx={ps.tableRow(idx)}>
                <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>{e.employeeNumber}</TableCell>
                <TableCell sx={ps.cellText}>{e.name}</TableCell>
                <TableCell sx={ps.cellTextSecondary}>{e.areaHistorica || '—'}</TableCell>
                <TableCell sx={ps.cellTextSecondary}>{e.fechaIngreso || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label="Baja" sx={ps.statusChip('CANCELADA')} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState compact title="Sin resultados" description="Nadie coincide con esta búsqueda." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
