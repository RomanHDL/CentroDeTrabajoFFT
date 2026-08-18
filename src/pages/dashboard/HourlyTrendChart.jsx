import React from 'react'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
      borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3,
    }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{label} h</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{payload[0].value.toLocaleString('es-MX')} piezas</Box>
    </Box>
  )
}

export default function HourlyTrendChart({ data, dataKey = 'quantity', height = 220 }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'
  const lineColor = '#3B82F6'

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="hour" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey={dataKey} stroke={lineColor} strokeWidth={2} fill="url(#hourlyFill)" dot={{ r: 3, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}
