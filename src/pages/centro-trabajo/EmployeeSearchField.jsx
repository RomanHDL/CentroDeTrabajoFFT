import React, { useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import { searchEmployees } from '../../data/personnel/repository'
import EmployeeAvatar from './EmployeeAvatar'

/**
 * Buscador de empleado por numero O nombre (Autocomplete
 * libre): escribes "3647" o "Román" y ambos funcionan. No
 * exige conocer el numero de memoria.
 */
export default function EmployeeSearchField({
  label = 'Número o nombre de empleado',
  value,
  onChange,
  autoFocus,
}) {
  const [inputValue, setInputValue] = useState(value?.employeeNumber || '')
  const options = useMemo(() => searchEmployees(inputValue), [inputValue])

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      options={options}
      value={value || null}
      inputValue={inputValue}
      filterOptions={(x) => x}
      getOptionLabel={(opt) =>
        typeof opt === 'string' ? opt : `${opt.employeeNumber} — ${opt.name}`
      }
      isOptionEqualToValue={(opt, val) => opt.id === val?.id}
      onInputChange={(_, newValue, reason) => {
        setInputValue(newValue)
        if (reason === 'input') onChange(null, newValue)
      }}
      onChange={(_, selected) => {
        if (selected && typeof selected !== 'string') {
          setInputValue(selected.employeeNumber)
          onChange(selected, selected.employeeNumber)
        }
      }}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          key={option.id}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}
        >
          <EmployeeAvatar employee={option} size={32} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
              {option.employeeNumber} — {option.name}
            </Typography>
            {option.fechaIngreso && (
              <Typography sx={{ fontSize: 11.5, opacity: 0.6 }}>
                Ingreso: {option.fechaIngreso}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          autoFocus={autoFocus}
          label={label}
          placeholder="3647 o Román"
          InputProps={{
            ...params.InputProps,
            startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5, fontSize: 20 }} />,
          }}
        />
      )}
    />
  )
}
