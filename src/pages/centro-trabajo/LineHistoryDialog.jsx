import React, { useMemo } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { workCenterById } from '../../data/production/catalog'
import { getMovementsForDate, todayISO } from '../../data/personnel/repository'

const MOVEMENT_LABEL = { CHECK_IN: 'Entrada', MOVE: 'Movimiento', RELEASE: 'Puesto liberado' }

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

export default function LineHistoryDialog({ lineId, open, onClose }) {
  const ps = usePageStyles()
  const movements = useMemo(() => {
    if (!lineId) return []
    return getMovementsForDate(todayISO())
      .filter((m) => m.fromAreaId === lineId || m.toAreaId === lineId)
      .sort((a, b) => (a.movedAt < b.movedAt ? 1 : -1))
  }, [lineId, open])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>
        Historial de {workCenterById(lineId)?.name || lineId} — hoy
      </DialogTitle>
      <DialogContent dividers>
        {movements.length === 0 ? (
          <EmptyState
            compact
            title="Sin movimientos hoy"
            description="No ha habido entradas ni movimientos en esta área hoy."
          />
        ) : (
          <Stack spacing={1}>
            {movements.map((m) => (
              <Box
                key={m.id}
                sx={{ display: 'flex', gap: 1.5, p: 1.1, borderRadius: 2, bgcolor: 'action.hover' }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 13, minWidth: 44 }}>
                  {m.movedAt}
                </Typography>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                    {m.employeeNumber} · {MOVEMENT_LABEL[m.type] || m.type}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                    {m.fromAreaId
                      ? `${areaLabel(m.fromAreaId)} / ${m.fromStationId} → ${m.toAreaId ? `${areaLabel(m.toAreaId)} / ${m.toStationId}` : 'sin asignación'}`
                      : `${areaLabel(m.toAreaId)} · ${m.toStationId}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
