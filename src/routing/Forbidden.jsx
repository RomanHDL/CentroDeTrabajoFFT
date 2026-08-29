import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import BlockIcon from '@mui/icons-material/Block'

export default function Forbidden() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 1.5,
        textAlign: 'center',
        px: 2,
      }}
    >
      <BlockIcon sx={{ fontSize: 48, color: 'error.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        Acceso no autorizado
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 420 }}>
        Tu rol no tiene permiso para ver esta sección.
      </Typography>
    </Box>
  )
}
