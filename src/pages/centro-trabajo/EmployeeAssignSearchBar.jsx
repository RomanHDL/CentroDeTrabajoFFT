import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import SearchIcon from '@mui/icons-material/Search'
import { searchEmployees, getCurrentAssignment } from '../../data/personnel/repository'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getEffectiveAreaForEmployee } from '../../data/production/personnelByArea'
import { workCenterById } from '../../data/production/catalog'
import { useDndAssign } from '../../state/dndAssign'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Buscador de empleado por numero o nombre, para asignar/mover
   rapido a `areaId` sin depender del drag (importante en tablet).
   Reutiliza exactamente searchEmployees (ya filtra bajas/no
   elegibles — ver directory.js/repository.js) y requestAssign de
   DndAssignProvider — la MISMA logica que ya usa el drag & drop,
   nunca un tercer camino de asignacion.
   ───────────────────────────────────────────── */
export default function EmployeeAssignSearchBar({ areaId }) {
  const [query, setQuery] = useState('')
  usePersonnelVersion()
  const dnd = useDndAssign()
  const results = query.trim() ? searchEmployees(query, 8) : []

  function handlePick(employee) {
    dnd.requestAssign(employee.id, areaId)
    setQuery('')
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por número de empleado o nombre..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ opacity: 0.5 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiInputBase-input': { fontSize: 15, py: 1.4 },
          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
        }}
      />

      {query.trim() && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute',
            zIndex: 20,
            mt: 0.5,
            width: '100%',
            maxHeight: 320,
            overflowY: 'auto',
            borderRadius: 2,
          }}
        >
          {results.length === 0 ? (
            <Typography sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>
              No se encontró personal activo con ese criterio.
            </Typography>
          ) : (
            <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
              {results.map((employee) => {
                const current = getCurrentAssignment(employee.id)
                const effectiveAreaId = current?.areaId ?? getEffectiveAreaForEmployee(employee.id)
                const sameArea = effectiveAreaId === areaId
                const formattedNumber = formatEmployeeNumber(employee.employeeNumber)
                const numberLabel =
                  formattedNumber === 'PROYECTO' ? 'PROYECTO' : `#${formattedNumber}`
                return (
                  <Stack
                    key={employee.id}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ p: 1.5 }}
                  >
                    <EmployeeAvatar employee={employee} size={38} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5 }}>
                        {employee.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                        {numberLabel} ·{' '}
                        {effectiveAreaId
                          ? `Actualmente: ${workCenterById(effectiveAreaId)?.name || effectiveAreaId}`
                          : 'Sin asignación'}
                      </Typography>
                    </Box>
                    {sameArea ? (
                      <Chip size="small" label="Ya está aquí" sx={{ fontWeight: 700 }} />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handlePick(employee)}
                        sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                      >
                        {current ? 'Mover aquí' : 'Asignar'}
                      </Button>
                    )}
                  </Stack>
                )
              })}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  )
}
