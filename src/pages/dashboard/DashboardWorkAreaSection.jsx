import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { workCenterById } from '../../data/production/catalog'
import { getAreaHeadcount } from '../../data/production/personnelByArea'
import { EmptyState } from '../../ui'
import WorkAreaMap from '../../components/WorkAreaMap'
import LineDetailDrawer from '../centro-trabajo/LineDetailDrawer'

/* ─────────────────────────────────────────────
   Vista rapida del layout para el Dashboard: el mismo plano que
   Centro de Trabajo (WorkAreaMap), pero al hacer click abre un
   Drawer flotante en vez del panel operativo completo — el
   Dashboard responde "como esta el centro", no es la vista de
   gestion (esa vive en Centro de Trabajo).
   ───────────────────────────────────────────── */
export default function DashboardWorkAreaSection() {
  const [selection, setSelection] = useState(null)
  const [selectedLineId, setSelectedLineId] = useState(null)

  function handleSelect(sel) {
    if (sel.type === 'area') setSelectedLineId(sel.id)
    else setSelection(sel)
  }

  return (
    <Box>
      <WorkAreaMap selection={selection} onSelect={handleSelect} size="md" />

      <Drawer anchor="right" open={!!selection} onClose={() => setSelection(null)}>
        <Box sx={{ width: { xs: '100vw', sm: 380 }, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{selection?.label}</Typography>
            <IconButton onClick={() => setSelection(null)}><CloseIcon /></IconButton>
          </Box>

          {selection?.type === 'empty' && (
            <EmptyState
              compact
              title="Sin datos de personal todavía"
              description="Esta zona aparece en el plano real, pero todavía no hay una fuente de personal conectada a ella."
            />
          )}

          {selection?.type === 'zoneGroup' && (
            <>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                {selection.label} agrupa estas líneas — selecciona una para ver su personal:
              </Typography>
              <List sx={{ py: 0 }}>
                {selection.areaIds.map((areaId) => {
                  const area = workCenterById(areaId)
                  const count = getAreaHeadcount(areaId)
                  return (
                    <ListItemButton
                      key={areaId}
                      onClick={() => { setSelectedLineId(areaId); setSelection(null) }}
                      sx={{ borderRadius: 1.5, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={area?.name || areaId}
                        secondary={`${count} persona${count === 1 ? '' : 's'} en el snapshot real`}
                        primaryTypographyProps={{ fontWeight: 700, fontSize: 13.5 }}
                        secondaryTypographyProps={{ fontSize: 11.5 }}
                      />
                      <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </ListItemButton>
                  )
                })}
              </List>
            </>
          )}
        </Box>
      </Drawer>

      <LineDetailDrawer workCenterId={selectedLineId} open={!!selectedLineId} onClose={() => setSelectedLineId(null)} />
    </Box>
  )
}
