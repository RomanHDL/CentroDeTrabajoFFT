import Box from '@mui/material/Box'
import OperatingFloorPlan from '../../components/OperatingFloorPlan'

/* Vista rapida del layout para el Dashboard: a peticion explicita del
   usuario (2026-08-24), ahora es EXACTAMENTE el mismo plano 2D
   completo de Layout 2D (conveyors, CT LINEA 1/0 acostadas, bloque
   FFT, Midea/High Value+Productos Mixtos fusionado, Insumos+
   Suministro fusionado, Paletizado, fila de apoyo) -- antes usaba
   WorkAreaMap (el mockup anterior), que ya no se usa aqui. Solo de
   consulta: la prop readOnly desactiva el click/drag&drop que
   OperatingFloorPlan SI habilita en Layout2DPage.jsx para las barras
   de Conveyor Principal/Secundario (2026-08-25) -- el resto del plano
   sigue siendo de solo lectura en ambos lugares, igual que siempre.
   El Dashboard sigue sin ser un punto de manipulacion del layout --
   eso sigue viviendo en Centro de Trabajo (AreasLayoutView) y ahora
   tambien en Layout 2D, solo para los conveyors. */
export default function DashboardWorkAreaSection() {
  return (
    <Box>
      <OperatingFloorPlan readOnly />
    </Box>
  )
}
