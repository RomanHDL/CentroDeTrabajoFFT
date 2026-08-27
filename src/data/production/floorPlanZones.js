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
   - "CT Paletizado" aparecía DOS veces (columna izquierda con lista
     de personas, zona grande "Palletizing" a la derecha) -- a
     petición explícita del usuario (2026-08-24) se quitó la caja de
     arriba a la izquierda, dejando solo "CT Paletizado (Palletizing)"
     como única representación real de esa área en este módulo.
   - PROYECTO / "CT LINEA 0" ya NO va en SUPPORT_CARD_AREA_IDS: a
     petición explícita del usuario (2026-08-24) se dibuja como barra
     horizontal, apilada debajo de LINEA1 (también horizontal ahora),
     en el espacio que dejó libre la caja de Paletizado que se quitó
     -- ver Layout2DPage.jsx (grid area "paletizado").
   - "Midea y Productos Mixtos" en la imagen es un bloque visual
     distinto a "CT Midea / High Value", pero el catálogo real solo
     tiene UN área HIGH_VALUE (Midea y High Value ya están fusionados
     ahí, ver catalog.js) -- se dibuja como decoración pura sin
     conteo propio, nunca como una segunda fuente de datos. A petición
     explícita del usuario (2026-08-24) las dos cajas se fusionaron en
     una sola ("CT Midea / High Value" con la decoración de Productos
     Mixtos adentro, a la derecha del conteo real).

   Intercambio de posición y tamaño 2026-08-24 (a petición explícita
   del usuario, en dos pasos): "CT Insumos" y "CT Suministro de
   material" (dos áreas reales sin plantilla oficial) se fusionaron en
   una sola caja "CT Insumos y Suministro de material" -- ver
   InsumosSuministroZone en Layout2DPage.jsx, siguen siendo dos
   WORK_CENTER separados en el catálogo, solo se dibujan juntos. Esa
   caja fusionada se movió al lado donde antes estaba "CT Accesorios"
   (izquierda de esa fila) y Accesorios al lado donde estaban
   Insumos+Suministro (derecha) -- pero a diferencia del primer intento,
   el usuario pidió explícitamente que cada una se quedara con el
   TAMAÑO angosto/ancho que tenía la otra, no con su propio tamaño
   original: Insumos+Suministro (poca gente, sin plantilla) queda
   angosta, Accesorios (20 de plantilla) queda ancha, en el orden
   izquierda-angosta / derecha-ancha.

   IMPORTANTE sobre las 10 líneas: no hay forma confirmada de mapear
   bahía física → número de línea desde la imagen (aviso visible en
   pantalla); se muestran en el orden del catálogo LINEA1..LINEA10. */

export const FFT_LINE_IDS = LINES_ONLY.map((w) => w.id)

/* Cards pequeñas de apoyo, fila inferior del mismo plano -- mismo
   sistema visual que las zonas grandes, solo más compactas (no
   representan una línea física principal). */
// 2026-08-26 ("Reestructuracion operativa FFT", a peticion explicita del
// usuario): SOPORTE se quita (archivada, `active:false` -- ya no aparece
// en el plano). ENTRENADOR se agrega (WC nuevo, mismo trato de card
// pequeña que el resto de areas de apoyo).
export const SUPPORT_CARD_AREA_IDS = [
  'CALIDAD', 'CAPACITACION', 'TEAM_LEADER', 'ENTRENADOR', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR',
]

/* Zonas visibles en la imagen sin área de catálogo mapeada con confianza
   -- se dibujan como referencia (sin conteo) en vez de forzar un mapeo
   incierto. Vacío desde 2026-08-26: "PNP / POC / PEN" (única entrada que
   existió aquí) se fusionó dentro de WC Insumos y Suministro de Material
   (ver catalog.js/AREA_DETAIL_GROUPS.INSUMOS) -- ya no se dibuja como caja
   propia en ningún lado, deja de mostrarse como Work Center independiente.
   El array se conserva vacío (en vez de borrarlo) para no romper a quien
   ya lo consume (EstacionesTab.jsx) y por si en el futuro aparece otra
   zona real sin WORK_CENTER confirmado. */
export const REFERENCE_ONLY_ZONES = []
