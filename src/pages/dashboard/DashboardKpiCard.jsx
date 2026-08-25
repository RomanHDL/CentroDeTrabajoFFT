import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { alpha } from '@mui/material/styles'

/* ─────────────────────────────────────────────
   Card compacta y horizontal para las 3 KPI del Dashboard (Personal,
   Personal faltante, Líneas operando) -- rediseño 2026-08-24 a
   petición explícita del usuario: las cards anteriores (Paper propio
   para "Personal" + KpiCard de src/ui para las otras dos) eran
   verticales y demasiado altas. Este componente es EXCLUSIVO de estas
   3 cards del Dashboard -- KpiCard (src/ui/KpiCard.jsx) sigue
   exactamente igual y se sigue usando tal cual en PersonalDeHoyTab.jsx
   y UsuariosPage.jsx, no se tocó para no afectarlas.

   El "⋮" es puramente decorativo (el usuario lo pidió igual que en su
   mockup de referencia, aclarando explícitamente no agregar lógica si
   no existe funcionalidad real detrás) -- no tiene onClick.

   secondaryLabel/secondaryValue/secondaryNote: bloque extra opcional
   despues de un divisor vertical (solo la card "Personal" lo usa, para
   "Ideal 137 / Meta por área"). tooltipNote: texto largo que antes
   vivía permanente en la card ("Meta de personal por área — no es el
   total de empleados del sistema.") -- ahora vive en un Tooltip sobre
   secondaryNote, nunca ocupa espacio fijo. */
export default function DashboardKpiCard({
  icon, accent, title, subtitle, value, unit,
  secondaryLabel, secondaryValue, secondaryNote, tooltipNote,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%', minHeight: 112, borderRadius: '16px', p: 1.75,
        display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden',
        border: '1px solid', borderColor: alpha(accent, 0.14),
        borderLeft: `3px solid ${accent}`,
        bgcolor: (t) => alpha(accent, t.palette.mode === 'dark' ? 0.05 : 0.03),
      }}
    >
      <Box sx={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        bgcolor: alpha(accent, 0.12), display: 'grid', placeItems: 'center', color: accent,
        border: '1px solid', borderColor: alpha(accent, 0.18),
        '& .MuiSvgIcon-root': { fontSize: 24 },
      }}>
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <IconButton size="small" disableRipple sx={{ p: 0, mt: -0.25, color: 'text.disabled', cursor: 'default' }}>
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 500, mb: 0.5, lineHeight: 1.2 }} noWrap>
          {subtitle}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1, letterSpacing: -0.5 }}>
              {value}
            </Typography>
            {unit && (
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                {unit}
              </Typography>
            )}
          </Stack>

          {secondaryValue != null && (
            <>
              <Divider orientation="vertical" flexItem sx={{ borderColor: alpha(accent, 0.2), my: 0.25 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3, lineHeight: 1.2 }}>
                  {secondaryLabel}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.secondary', lineHeight: 1.2 }}>
                  {secondaryValue}
                </Typography>
                {secondaryNote && (
                  <Tooltip title={tooltipNote || ''} disableHoverListener={!tooltipNote} arrow placement="bottom-start">
                    <Typography sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1.2, cursor: tooltipNote ? 'help' : 'default' }} noWrap>
                      {secondaryNote}
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </Paper>
  )
}
