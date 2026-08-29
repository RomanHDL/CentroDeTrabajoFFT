import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Divider from '@mui/material/Divider'
import { Link } from 'react-router-dom'
import {
  ARCHITECTURE_OVERVIEW,
  AUTH_OVERVIEW,
  DATA_DICTIONARY,
  API_MAP,
} from './developerManualData'

// Developer Manual (MI Stack Reference, sección 14d, HARD RULE) -- ruta real
// en la app, contenido genuino (diccionario de datos de las 18 tablas reales
// de prisma/schema.prisma), no un stub. Ver developerManualData.js para el
// contenido -- este componente solo renderiza.
export default function DeveloperManualPage() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
        Developer Manual
      </Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3 }}>
        Arquitectura y diccionario de datos real de Centro de Trabajo FFT.{' '}
        <Link to="/manual">Ver el Manual de Usuario</Link>.
      </Typography>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Arquitectura
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-line', fontSize: 14 }}>
          {ARCHITECTURE_OVERVIEW}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Autenticación
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-line', fontSize: 14 }}>{AUTH_OVERVIEW}</Typography>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Mapa de la API
        </Typography>
        <Table size="small">
          <TableBody>
            {API_MAP.map(([route, desc]) => (
              <TableRow key={route}>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                  {route}
                </TableCell>
                <TableCell sx={{ fontSize: 13 }}>{desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
        Diccionario de datos ({DATA_DICTIONARY.length} tablas)
      </Typography>
      {DATA_DICTIONARY.map((entry) => (
        <Paper key={entry.model} sx={{ p: 2.5, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{entry.model}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>
            {entry.purpose}
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Campo</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Tipo</TableCell>
                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>Notas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entry.fields.map(([field, type, notes]) => (
                <TableRow key={field}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{field}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{type}</TableCell>
                  <TableCell sx={{ fontSize: 12.5, color: 'text.secondary' }}>{notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ))}
    </Box>
  )
}
