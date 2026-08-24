import Box from '@mui/material/Box'
import WorkAreaMap from '../../components/WorkAreaMap'

/* ─────────────────────────────────────────────
   Vista rapida del layout para el Dashboard: el mismo plano que
   Centro de Trabajo (WorkAreaMap), pero SOLO de consulta (2026-08-24,
   a peticion del usuario) — el Dashboard responde "como esta el
   centro", nunca es un punto de manipulacion (eso vive unicamente en
   Centro de Trabajo, vía AreasLayoutView, que sigue interactivo).
   readOnly desactiva click/drag/drop en WorkAreaMap, asi que ya no
   hay panel/Drawer que abrir aqui.
   ───────────────────────────────────────────── */
export default function DashboardWorkAreaSection() {
  return (
    <Box>
      <WorkAreaMap selection={null} onSelect={() => {}} readOnly />
    </Box>
  )
}
