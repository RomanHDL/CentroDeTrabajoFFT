import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import InboxIcon from '@mui/icons-material/Inbox'

export default function EmptyState({
  icon,
  title = 'Sin datos disponibles',
  description = '',
  action,
  compact = false,
}) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: compact ? 3 : 5,
        px: 2,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          bgcolor: d ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.02)',
          border: '1px solid',
          borderColor: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
          color: 'text.secondary',
          mb: 2,
          '& .MuiSvgIcon-root': { fontSize: compact ? 24 : 32, opacity: 0.4 },
        }}
      >
        {icon || <InboxIcon />}
      </Box>
      <Typography
        sx={{ fontWeight: 600, fontSize: compact ? 13 : 14, color: 'text.primary', mb: 0.5 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          sx={{
            fontSize: compact ? 12 : 13,
            color: 'text.secondary',
            maxWidth: 360,
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}
