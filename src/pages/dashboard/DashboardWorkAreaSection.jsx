import Box from '@mui/material/Box'
import OperatingFloorPlan from '../../components/OperatingFloorPlan'

/* Vista rapida del layout para el Dashboard: a peticion explicita del
   usuario (2026-08-24), ahora es EXACTAMENTE el mismo plano 2D
   completo de Layout 2D (conveyors, CT LINEA 1/0 acostadas, bloque
   FFT, Midea/High Value+Productos Mixtos fusionado, Insumos+
   Suministro fusionado, Paletizado, fila de apoyo) -- antes usaba
   WorkAreaMap (el mockup anterior), que ya no se usa aqui. Solo de
   consulta: OperatingFloorPlan no tiene drag&drop, solo click para
   ver detalle (igual que ya era en Layout2DPage), asi que el Dashboard
   sigue sin ser un punto de manipulacion del layout -- eso sigue
   viviendo unicamente en Centro de Trabajo (AreasLayoutView). */
export default function DashboardWorkAreaSection() {
  return (
    <Box>
      <OperatingFloorPlan />
    </Box>
  )
}
