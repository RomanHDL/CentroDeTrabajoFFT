/* Datos reales del organigrama (2026-09-11, a petición explícita del usuario: reemplaza la
   imagen plana estructura-organizacional.png por un árbol interactivo). Todo el CONTENIDO del
   organigrama (nombres/puestos/áreas) se mantiene SIEMPRE en inglés/español segun el campo
   -- ver comentario de OrganigramaPage.jsx -- independiente del idioma que tenga elegido el
   usuario en el resto de la app, por eso este archivo nunca usa i18n.

   Celular/correo/fecha de ingreso quedan null a propósito (el usuario pidió dejarlos en blanco
   por ahora, "—" en la UI) -- nunca se inventa un dato real de una persona real. photo: null
   usa un avatar con iniciales en vez de foto (Felipe/Johnatan, gente nueva sin foto todavía).

   2026-09-11, cuarta pasada (a peticion explicita del usuario, rediseño completo con spec
   detallado + imagen de referencia): se agrega a Oscar Enrique Pizano Guzman como nueva raiz
   del arbol, arriba de Juan Sillas -- sin foto real todavia (avatar con iniciales "OP", nunca
   se inventa una fotografia). Juan Sillas gana un puesto ("Dirección / Liderazgo") y jefe
   directo (Oscar), tal cual el mockup de referencia que dio el usuario -- antes no tenia
   ninguno de los dos. */
export const ORG_CHART = {
  id: 'oscar-pizano',
  name: 'Oscar Enrique Pizano Guzman',
  title: 'Dirección General',
  area: null,
  department: null,
  manager: null,
  photo: null,
  phone: null,
  email: null,
  hireDate: null,
  // Correccion visual (2026-09-11, sexta pasada -- a peticion explicita del usuario, "el nombre
  // aparece cortado... la card puede aumentar ligeramente de ancho SOLAMENTE para Oscar"): las
  // demas tarjetas usan el ancho estandar (CARD_WIDTH en OrganigramaPage.jsx), Oscar necesita
  // mas espacio por su nombre completo.
  cardWidth: 280,
  children: [
    {
      id: 'juan-sillas',
      name: 'Juan Sillas',
      title: 'Dirección / Liderazgo',
      area: null,
      department: null,
      manager: 'Oscar Enrique Pizano Guzman',
      photo: '/organigrama/photos/juan-sillas.png',
      phone: null,
      email: null,
      hireDate: null,
      groupLabel: 'Production Management',
      children: [
        {
          id: 'cain-bautista',
          name: 'Cain Bautista',
          title: 'Production Manager',
          area: 'Production',
          department: 'Production',
          manager: 'Juan Sillas',
          photo: '/organigrama/photos/cain-bautista.png',
          phone: null,
          email: null,
          hireDate: null,
          groupLabel: 'Operational Leadership',
          children: [
            {
              id: 'diego-zamudio',
              name: 'Diego Zamudio',
              title: 'Production Team Leader',
              area: 'Production',
              department: 'Production',
              manager: 'Cain Bautista',
              photo: '/organigrama/photos/diego-zamudio.png',
              phone: null,
              email: null,
              hireDate: null,
            },
            {
              id: 'johnatan',
              name: 'Johnatan',
              title: 'Production Team Leader',
              area: 'Production',
              department: 'Production',
              manager: 'Cain Bautista',
              photo: null,
              phone: null,
              email: null,
              hireDate: null,
            },
            {
              id: 'arturo-badillo',
              name: 'Arturo Badillo',
              title: 'Training & Coaching',
              area: 'Training & Coaching',
              department: 'Production',
              manager: 'Cain Bautista',
              photo: '/organigrama/photos/arturo-badillo.png',
              phone: null,
              email: null,
              hireDate: null,
            },
          ],
          secondGroupLabel: 'Area Leaders',
          secondGroupChildren: [
            {
              id: 'sandra-barron',
              name: 'Sandra Barrón',
              title: 'Accessories Leader',
              area: 'Accessories',
              department: 'Production',
              manager: 'Cain Bautista',
              photo: '/organigrama/photos/sandra-barron.png',
              phone: null,
              email: null,
              hireDate: null,
            },
            {
              id: 'ernesto-rivera',
              name: 'Ernesto Rivera',
              title: 'Boxes & Supplies Leader',
              area: 'Boxes & Supplies',
              department: 'Production',
              manager: 'Cain Bautista',
              photo: '/organigrama/photos/ernesto-rivera.png',
              phone: null,
              email: null,
              hireDate: null,
            },
            {
              id: 'elias',
              name: 'Elías',
              title: 'Palletizing (FFT) Team Leader',
              area: 'Palletizing (FFT)',
              department: 'Production',
              manager: 'Cain Bautista',
              photo: '/organigrama/photos/elias.png',
              phone: null,
              email: null,
              hireDate: null,
            },
          ],
        },
        {
          id: 'felipe',
          name: 'Felipe',
          title: 'Production Manager',
          area: 'Production',
          department: 'Production',
          manager: 'Juan Sillas',
          photo: null,
          phone: null,
          email: null,
          hireDate: null,
        },
      ],
    },
  ],
}

/* Indices derivados de la jerarquia REAL del arbol (2026-09-14, a peticion explicita del
   usuario -- "para localizar al jefe NO dependas unicamente de comparar nombres... utiliza
   managerId o el identificador real"): se calculan UNA sola vez, caminando ORG_CHART, en vez de
   mantener a mano una segunda copia de las relaciones (que se podria desincronizar). El campo
   `manager` (texto, ej. "Oscar Enrique Pizano Guzman") sigue existiendo tal cual para mostrarlo
   en pantalla -- estos indices son solo para NAVEGAR de forma robusta, nunca comparando ese
   texto contra un nombre.

   - ORG_CHART_BY_ID: id -> nodo completo (para resolver "el jefe de X" en O(1)).
   - ORG_CHART_MANAGER_ID: id -> id del jefe directo (null si es la raiz, ej. Oscar).
   - ORG_CHART_PERSON_IDS: Set con todos los ids reales -- lo usa tambien el backend
     (api/organigrama/[id]/photo.js) para validar que un personId de una foto subida sea
     realmente alguien del organigrama, sin duplicar esta lista a mano en 2 lugares. */
function buildOrgChartIndexes(root) {
  const byId = new Map()
  const managerId = new Map()
  const walk = (node, parentId) => {
    byId.set(node.id, node)
    managerId.set(node.id, parentId)
    for (const child of node.children || []) walk(child, node.id)
    for (const child of node.secondGroupChildren || []) walk(child, node.id)
  }
  walk(root, null)
  return { byId, managerId }
}

const { byId: ORG_CHART_BY_ID, managerId: ORG_CHART_MANAGER_ID } = buildOrgChartIndexes(ORG_CHART)
export const ORG_CHART_PERSON_IDS = new Set(ORG_CHART_BY_ID.keys())

export function getOrgChartPersonById(id) {
  return ORG_CHART_BY_ID.get(id) || null
}

export function getOrgChartManagerId(id) {
  return ORG_CHART_MANAGER_ID.get(id) || null
}

/* Camino completo desde la raiz hasta `id` (incluido), para el breadcrumb "Ubicacion en el
   organigrama" -- construido subiendo por ORG_CHART_MANAGER_ID, nunca inventando niveles. */
export function getOrgChartPath(id) {
  const path = []
  let current = ORG_CHART_BY_ID.get(id)
  while (current) {
    path.unshift(current)
    const parentId = ORG_CHART_MANAGER_ID.get(current.id)
    current = parentId ? ORG_CHART_BY_ID.get(parentId) : null
  }
  return path
}
