import { LINES_ONLY } from './catalog'

/* ─────────────────────────────────────────────
   Plano 2D "Área operando" (rediseño 2026-08-24 a partir del mockup
   que el usuario compartió, imagen titulada "Área operando"). Único
   plano integrado -- sin panel separado de "otras áreas" como la
   version anterior: cada área real del catálogo (excepto CONVEYOR y
   SELLADO, ver abajo) tiene un lugar fijo en el mismo grid, ya sea
   como zona física grande o como card pequeña de apoyo en la fila
   inferior. Nunca dos representaciones del mismo dato en dos lugares
   distintos del modulo.

   EXCLUSIONES EXPLICITAS A PETICION DEL USUARIO:
   - CONVEYOR: los dos conveyors del plano (Principal/Secundario) son
     puramente decorativos -- franjas fijas arriba, sin conteo. El
     usuario pidio explicitamente que NO exista ninguna card/zona de
     datos "CT Conveyor" en este modulo. El área real CONVEYOR sigue
     existiendo y visible en Centro de Trabajo; aquí simplemente no
     se muestra.
   - SELLADO: el usuario pidió explícitamente que "CT Sellado" no
     aparezca en este módulo bajo ninguna forma. Sigue visible en
     Centro de Trabajo.

   JUICIO PROPIO (marcado explícitamente en el reporte al usuario):
   - PROYECTO / "CT LINEA 0" no aparece en la imagen de referencia ni
     en el pedido, pero es un área real con gente todos los días --
     se agrega como una card más en SUPPORT_CARD_AREA_IDS (fila
     inferior de apoyo), no como zona física grande, para no perder
     visibilidad de esas personas en una vista donde el admin espera
     ver a todo mundo.
   - "CT Paletizado" aparece DOS veces en la imagen (columna
     izquierda con lista de personas, zona grande "Palletizing" a la
     derecha). Solo existe UN área real PALETIZADO en el catálogo --
     Layout2DPage.jsx liga ambas cajas al mismo id real: la izquierda
     lista personas, la derecha es deliberadamente una zona grande
     sin lista (representa el espacio físico que ocupa), igual idea
     que "Midea y Productos Mixtos" abajo.
   - "Midea y Productos Mixtos" en la imagen es un bloque visual
     distinto a "CT Midea / High Value", pero el catálogo real solo
     tiene UN área HIGH_VALUE (Midea y High Value ya están fusionados
     ahí, ver catalog.js) -- se dibuja como decoración pura sin
     conteo propio, nunca como una segunda fuente de datos.

   IMPORTANTE sobre las 10 líneas: no hay forma confirmada de mapear
   bahía física → número de línea desde la imagen (aviso visible en
   pantalla); se muestran en el orden del catálogo LINEA1..LINEA10. */

export const FFT_LINE_IDS = LINES_ONLY.map((w) => w.id)

/* Cards pequeñas de apoyo, fila inferior del mismo plano -- mismo
   sistema visual que las zonas grandes, solo más compactas (no
   representan una línea física principal). */
export const SUPPORT_CARD_AREA_IDS = [
  'CALIDAD', 'CAPACITACION', 'TEAM_LEADER', 'SOPORTE', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR', 'PROYECTO',
]

/* Zonas visibles en la imagen sin área de catálogo mapeada con
   confianza -- se dibujan como referencia (sin conteo) en vez de
   forzar un mapeo incierto. */
export const REFERENCE_ONLY_ZONES = [
  { key: 'pnp', label: 'PNP / POC / PEN' },
  { key: 'boxprep', label: 'BOX PREP' },
]
