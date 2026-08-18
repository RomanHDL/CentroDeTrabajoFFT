import React from 'react'
import Avatar from '@mui/material/Avatar'
import PersonIcon from '@mui/icons-material/Person'
import { alpha } from '@mui/material/styles'

function initialsOf(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

function colorForName(name) {
  const palette = ['#3B82F6', '#10B981', '#A855F7', '#F59E0B', '#06B6D4', '#EF4444']
  let hash = 0
  for (let i = 0; i < (name || '').length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return palette[Math.abs(hash) % palette.length]
}

/* Avatar de empleado — foto si existe (employee.photoUrl),
   si no iniciales sobre color estable, y si no hay ni
   nombre, icono generico. Nunca rompe la UI por falta de foto. */
export default function EmployeeAvatar({ employee, size = 56, dashed = false }) {
  const name = employee?.name
  const photoUrl = employee?.photoUrl

  if (!employee) {
    return (
      <Avatar sx={{
        width: size, height: size,
        bgcolor: 'transparent',
        border: '2px dashed',
        borderColor: 'divider',
        color: 'text.disabled',
      }}>
        <PersonIcon sx={{ fontSize: size * 0.5 }} />
      </Avatar>
    )
  }

  if (photoUrl) {
    return <Avatar src={photoUrl} alt={name} sx={{ width: size, height: size, border: dashed ? '2px dashed' : 'none', borderColor: 'divider' }} />
  }

  const color = colorForName(name || employee.employeeNumber || '')
  return (
    <Avatar sx={{
      width: size, height: size,
      bgcolor: alpha(color, 0.15),
      color,
      fontWeight: 800,
      fontSize: size * 0.34,
      border: `1px solid ${alpha(color, 0.3)}`,
    }}>
      {initialsOf(name) || <PersonIcon sx={{ fontSize: size * 0.5 }} />}
    </Avatar>
  )
}
