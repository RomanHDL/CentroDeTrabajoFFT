import React from 'react'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import { useTheme, alpha } from '@mui/material/styles'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

const ACCENTS = {
  blue: '#3B82F6', green: '#10B981', red: '#EF4444', amber: '#F59E0B',
  purple: '#A855F7', cyan: '#06B6D4', slate: '#64748B',
}

export default function KpiCard({ title, value, subtitle, icon, accent = 'blue', trend, trendLabel = '', onClick, compact = false }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const color = ACCENTS[accent] || ACCENTS.blue
  const isPositive = trend > 0

  return (
    <Paper elevation={0} onClick={onClick} sx={{
      p: compact ? 1.75 : 2.5, height: '100%', borderRadius: 3,
      borderLeft: `3px solid ${color}`, bgcolor: alpha(color, d ? 0.04 : 0.02),
      border: `1px solid ${alpha(color, d ? 0.18 : 0.12)}`, borderLeftWidth: 3, borderLeftColor: color,
      position: 'relative', overflow: 'hidden',
      transition: 'all .2s cubic-bezier(.4,0,.2,1)', cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(color, 0.12)}`, borderColor: color } : {},
    }}>
      {icon && (
        <Box sx={{
          width: compact ? 32 : 38, height: compact ? 32 : 38, borderRadius: 2, flexShrink: 0, mb: 1.25,
          bgcolor: alpha(color, 0.10), display: 'grid', placeItems: 'center', color,
          border: `1px solid ${alpha(color, 0.15)}`,
          '& .MuiSvgIcon-root': { fontSize: compact ? 16 : 18 },
        }}>
          {icon}
        </Box>
      )}
      <Typography sx={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: compact ? 22 : 28, fontWeight: 800, color: 'text.primary', lineHeight: 1, mb: 0.5, letterSpacing: -0.5 }}>
        {value}
      </Typography>
      {(subtitle || typeof trend === 'number') && (
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          {subtitle && <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500 }}>{subtitle}</Typography>}
          {typeof trend === 'number' && trend !== 0 && (
            <Chip size="small"
              icon={isPositive ? <TrendingUpIcon sx={{ fontSize: '13px !important' }} /> : <TrendingDownIcon sx={{ fontSize: '13px !important' }} />}
              label={`${isPositive ? '+' : ''}${trend} ${trendLabel}`}
              sx={{
                height: 20, fontSize: 10, fontWeight: 700,
                bgcolor: alpha(isPositive ? '#10B981' : '#EF4444', 0.08),
                color: isPositive ? '#10B981' : '#EF4444',
                border: `1px solid ${alpha(isPositive ? '#10B981' : '#EF4444', 0.18)}`,
                '& .MuiChip-label': { px: 0.5 }, '& .MuiChip-icon': { ml: 0.25 },
              }} />
          )}
        </Stack>
      )}
    </Paper>
  )
}
