import React from 'react'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts'

const ACCENT_HEX = { blue: '#3B82F6', green: '#10B981', amber: '#F59E0B', red: '#EF4444', slate: '#64748B' }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <Box sx={{
      bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
      borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3,
    }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{label}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
        {row.production.toLocaleString('es-MX')} / {row.target.toLocaleString('es-MX')} piezas ({row.pct ?? 0}%)
      </Box>
    </Box>
  )
}

export default function ComparisonChart({ data, height = 260 }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'

  return (
    <Box sx={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 12, left: -12, bottom: 4 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={54} />
          <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: d ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' }} />
          <Bar dataKey="production" radius={[4, 4, 0, 0]} maxBarSize={34}>
            <LabelList dataKey="production" position="top" style={{ fontSize: 10, fontWeight: 700, fill: axisColor }} />
            {data.map((row) => (
              <Cell key={row.id} fill={ACCENT_HEX[row.accent] || ACCENT_HEX.slate} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}
