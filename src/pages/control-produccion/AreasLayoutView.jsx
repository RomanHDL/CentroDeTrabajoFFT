import React, { useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import { alpha, useTheme } from '@mui/material/styles'
import { WORK_CENTERS } from '../../data/production/catalog'
import { REAL_PERSONNEL_SNAPSHOT, BASE_SNAPSHOT_DATE } from '../../data/production/realPersonnelSnapshot'

/* ─────────────────────────────────────────────
   Vista tipo "plano" agrupada por area — inspirada en el diseño
   visual real de la hoja LAYOUT del Excel (cajas agrupadas por
   area, con los nombres reales adentro), en vez de las tarjetas
   uniformes anteriores.

   Es una vista de REFERENCIA del snapshot de BASE (personal real,
   sin numero de empleado porque el Excel no lo trae) — no esta
   conectada al sistema de asignacion diaria real (DailyAssignment),
   que sigue empezando vacio hasta que exista un check-in real o la
   importacion formal a Neon.
   ───────────────────────────────────────────── */

function mapAreaZonaToId(areaZona) {
  if (!areaZona) return null
  if (areaZona.startsWith('LINEA ')) return 'LINEA' + areaZona.split(' ')[1]
  return areaZona
}

function AreaBox({ area, people, color, onOpenLine }) {
  return (
    <Paper
      elevation={0}
      onClick={() => onOpenLine?.(area.id)}
      sx={{
        minWidth: 150, flex: '1 1 150px', maxWidth: 230,
        border: '1px solid', borderColor: alpha(color, 0.35),
        borderTop: `3px solid ${color}`,
        borderRadius: 1.5, p: 1.25, cursor: onOpenLine ? 'pointer' : 'default',
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.07 : 0.045),
        transition: 'transform .15s ease',
        '&:hover': onOpenLine ? { transform: 'translateY(-2px)' } : {},
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: 'text.primary' }}>{area.name}</Typography>
        <Chip size="small" label={people.length} sx={{ height: 18, fontSize: 10.5, fontWeight: 700 }} />
      </Stack>
      {people.length === 0 ? (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontStyle: 'italic' }}>Sin personal en el Excel</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.15 }}>
          {people.map((p) => (
            <Typography key={p.id} sx={{ fontSize: 11.5, color: 'text.primary', lineHeight: 1.5 }}>· {p.name}</Typography>
          ))}
        </Box>
      )}
    </Paper>
  )
}

function AreaSection({ title, color, areas, peopleByArea, onOpenLine, sx }) {
  if (!areas.length) return null
  return (
    <Box sx={sx}>
      <Box sx={{ bgcolor: color, color: '#fff', borderRadius: 1.5, px: 1.5, py: 0.6, fontWeight: 800, fontSize: 12.5, mb: 1, display: 'inline-block' }}>
        {title}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
        {areas.map((area) => (
          <AreaBox key={area.id} area={area} people={peopleByArea[area.id] || []} color={color} onOpenLine={onOpenLine} />
        ))}
      </Box>
    </Box>
  )
}

export default function AreasLayoutView({ onOpenLine }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'

  const peopleByArea = useMemo(() => {
    const map = {}
    REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
      const areaId = mapAreaZonaToId(p.areaZona)
      if (!areaId) return
      map[areaId] = map[areaId] || []
      map[areaId].push(p)
    })
    return map
  }, [])

  const sinZona = useMemo(() => REAL_PERSONNEL_SNAPSHOT.filter((p) => !p.areaZona), [])

  const productionAreas = WORK_CENTERS.filter((w) => w.isProduction)
  const supportAreas = WORK_CENTERS.filter((w) => !w.isProduction)

  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.5 }}>
        Snapshot real de personal desde LAYOUT FFT.xlsx (hoja BASE) — {BASE_SNAPSHOT_DATE}. Números de empleado
        pendientes: BASE no trae esa columna todavía.
      </Typography>

      <AreaSection
        title="Líneas de producción y áreas"
        color="#10B981"
        areas={productionAreas}
        peopleByArea={peopleByArea}
        onOpenLine={onOpenLine}
      />

      <AreaSection
        title="Soporte y liderazgo"
        color="#64748B"
        areas={supportAreas}
        peopleByArea={peopleByArea}
        onOpenLine={onOpenLine}
        sx={{ mt: 2.5 }}
      />

      {sinZona.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2.5, p: 1.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider',
            bgcolor: d ? 'rgba(148,163,184,.06)' : 'rgba(148,163,184,.08)',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 12.5, mb: 1 }}>
            Sin zona asignada en el Excel ({sinZona.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {sinZona.map((p) => (
              <Chip key={p.id} size="small" label={p.asistencia ? `${p.name} (${p.asistencia})` : p.name} />
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  )
}
