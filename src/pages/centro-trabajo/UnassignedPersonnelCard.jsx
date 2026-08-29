import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EmployeeAvatar from './EmployeeAvatar'

const PREVIEW_LIMIT = 5

/* Etiqueta identificadora para gente real cuya zona cruda no corresponde a
   ningun WORK_CENTER del catalogo (2026-08-25, a peticion explicita del
   usuario: CHOFER/PRODUCCION son gente de linea sin linea especifica
   conocida -- se quedan "sin area asignada" pero identificados, en vez de
   inventarles una area propia). */
const ZONA_TAG_LABELS = { PRODUCCION: 'Producción', CHOFER: 'Chofer' }

function personTag(p) {
  return p.asistencia || ZONA_TAG_LABELS[p.areaZona] || null
}

function shortName(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}

/* "Personal sin area asignada" -- misma fuente de siempre
   (getPeopleWithoutArea, pasada por props desde AreasLayoutView, sin
   duplicar la llamada) -- antes era una lista de Chips con texto
   siempre visible al expandir; ahora es una preview compacta de
   avatares (a peticion explicita del usuario, 2026-08-25) y "Ver
   lista" abre un dialog simple en vez de crecer la card. */
export default function UnassignedPersonnelCard({ people }) {
  const [open, setOpen] = useState(false)
  const preview = people.slice(0, PREVIEW_LIMIT)
  const extra = Math.max(people.length - PREVIEW_LIMIT, 0)

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: people.length ? 1.5 : 0 }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
            Personal sin área asignada ({people.length})
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            Personas activas sin ubicación asignada en el centro de trabajo
          </Typography>
        </Box>
        {people.length > 0 && (
          <Button
            size="small"
            endIcon={<ChevronRightIcon fontSize="small" />}
            onClick={() => setOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
          >
            Ver lista
          </Button>
        )}
      </Stack>

      {people.length === 0 ? (
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', fontStyle: 'italic' }}>
          Todo el personal activo tiene una zona conocida.
        </Typography>
      ) : (
        <Stack direction="row" spacing={1.25} flexWrap="wrap" rowGap={1}>
          {preview.map((p) => {
            const tag = personTag(p)
            return (
              <Stack key={p.id} alignItems="center" spacing={0.4} sx={{ width: 56 }}>
                <EmployeeAvatar employee={p} size={40} />
                <Typography
                  sx={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.1 }}
                  noWrap
                >
                  {shortName(p.name)}
                </Typography>
                {tag && (
                  <Typography
                    sx={{
                      fontSize: 8.5,
                      color: 'text.secondary',
                      textAlign: 'center',
                      lineHeight: 1,
                    }}
                    noWrap
                  >
                    {tag}
                  </Typography>
                )}
              </Stack>
            )
          })}
          {extra > 0 && (
            <Stack alignItems="center" justifyContent="center" spacing={0.4} sx={{ width: 56 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                +{extra}
              </Box>
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>más</Typography>
            </Stack>
          )}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 800,
          }}
        >
          Personal sin área asignada ({people.length})
          <IconButton size="small" onClick={() => setOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ pb: 1 }}>
            {people.map((p) => {
              const tag = personTag(p)
              return <Chip key={p.id} size="small" label={tag ? `${p.name} (${tag})` : p.name} />
            })}
          </Stack>
        </DialogContent>
      </Dialog>
    </Paper>
  )
}
