/* ────────────────────────────────────────────
   Snapshot REAL de personal, extraido de LAYOUT FFT.xlsx (hoja BASE)
   el 2026-08-18. 116 filas, ninguna inventada.

   - name: EMPLEADO tal como viene en el Excel (Title Case para lectura).
   - areaZona: ZONA normalizada al catalogo de areas (catalog.js). null si
     BASE no traia zona para esa persona (ausente/sin ubicacion actual).
   - rawZona: ZONA exactamente como aparece en el Excel, sin normalizar
     (ej. "ACCESORIOS3", "CALIDAD11") — se conserva para no perder
     informacion, aunque areaZona ya la agrupo razonablemente.
   - actividad/asistencia: codigos crudos de BASE, SIN interpretar
     significado (igual que el resto del proyecto).

   BASE no tiene columna de numero de empleado — por eso NINGUNO de
   estos 116 tiene employeeNumber real; se muestra PENDIENTE para
   todos hasta la importacion formal con reconciliacion (Etapa 2).
   ──────────────────────────────────────────── */

export const BASE_SNAPSHOT_DATE = '2026-08-18'

export const REAL_PERSONNEL_SNAPSHOT = [
  {
    "id": "base-1",
    "name": "Ayde",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-2",
    "name": "Thelma",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-3",
    "name": "Rosa",
    "areaZona": null,
    "rawZona": null,
    "actividad": "LC",
    "asistencia": "F"
  },
  {
    "id": "base-4",
    "name": "Ezelin",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-5",
    "name": "Migdalia",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-6",
    "name": "Yailen",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-7",
    "name": "Peraza",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-8",
    "name": "Francisca",
    "areaZona": "SOPORTE",
    "rawZona": "SOPORTE",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-9",
    "name": "Angie",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-10",
    "name": "Alfredo",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-11",
    "name": "Miguel",
    "areaZona": null,
    "rawZona": null,
    "actividad": "EM",
    "asistencia": "F"
  },
  {
    "id": "base-12",
    "name": "Reynaldo",
    "areaZona": null,
    "rawZona": null,
    "actividad": "EM",
    "asistencia": "F"
  },
  {
    "id": "base-13",
    "name": "Juan Dd",
    "areaZona": null,
    "rawZona": null,
    "actividad": "EM",
    "asistencia": "F"
  },
  {
    "id": "base-14",
    "name": "Saul",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-15",
    "name": "Elian",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-16",
    "name": "Ramiro",
    "areaZona": null,
    "rawZona": null,
    "actividad": "EM",
    "asistencia": "F"
  },
  {
    "id": "base-17",
    "name": "Antonio",
    "areaZona": null,
    "rawZona": null,
    "actividad": "EM",
    "asistencia": "F"
  },
  {
    "id": "base-18",
    "name": "Jesus",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-19",
    "name": "Pedro",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-20",
    "name": "Jesus",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-21",
    "name": "Diego",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-22",
    "name": "Cesar",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "EM",
    "asistencia": "A"
  },
  {
    "id": "base-23",
    "name": "Francisco",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-24",
    "name": "Lidia",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-25",
    "name": "Patricia",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-26",
    "name": "Gudelia",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-27",
    "name": "Norma",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS5",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-28",
    "name": "Veronica",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-29",
    "name": "Sara",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-30",
    "name": "Victor",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-31",
    "name": "Daniela",
    "areaZona": null,
    "rawZona": null,
    "actividad": "L",
    "asistencia": "F"
  },
  {
    "id": "base-32",
    "name": "Socorro",
    "areaZona": null,
    "rawZona": null,
    "actividad": "L",
    "asistencia": "I"
  },
  {
    "id": "base-33",
    "name": "Ulises",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-34",
    "name": "Valentin",
    "areaZona": null,
    "rawZona": null,
    "actividad": "L",
    "asistencia": "F"
  },
  {
    "id": "base-35",
    "name": "Karol",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-36",
    "name": "Edith",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-37",
    "name": "Alexis",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-38",
    "name": "Esly",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-39",
    "name": "Delfina",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-40",
    "name": "Ricardo",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-41",
    "name": "Edgar",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "L",
    "asistencia": "A"
  },
  {
    "id": "base-42",
    "name": "Nancy",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-43",
    "name": "Lourdes",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-44",
    "name": "Ricardo",
    "areaZona": "LINEA 7",
    "rawZona": "LINEA 7",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-45",
    "name": "Juan",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "PE",
    "asistencia": "A"
  },
  {
    "id": "base-46",
    "name": "Bryan",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "M",
    "asistencia": "A"
  },
  {
    "id": "base-47",
    "name": "Luis",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F"
  },
  {
    "id": "base-48",
    "name": "Juan E",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F"
  },
  {
    "id": "base-49",
    "name": "Gustavo",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "M",
    "asistencia": "A"
  },
  {
    "id": "base-50",
    "name": "Hector",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "M",
    "asistencia": "A"
  },
  {
    "id": "base-51",
    "name": "Luis",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "M",
    "asistencia": "A"
  },
  {
    "id": "base-52",
    "name": "Alfredo",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F"
  },
  {
    "id": "base-53",
    "name": "Jhony",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F"
  },
  {
    "id": "base-54",
    "name": "Kevin",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F"
  },
  {
    "id": "base-55",
    "name": "Eleazar",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "M",
    "asistencia": "A"
  },
  {
    "id": "base-56",
    "name": "Sandra",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-57",
    "name": "Ernesto",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-58",
    "name": "Yesica",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-59",
    "name": "Lizbeth",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-60",
    "name": "Evelyn",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-61",
    "name": "Uriel",
    "areaZona": "LINEA 7",
    "rawZona": "LINEA 7",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-62",
    "name": "Juan",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-63",
    "name": "Cecilia",
    "areaZona": "CAPACITACION",
    "rawZona": "CAPACITACION",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-64",
    "name": "Oscar",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-65",
    "name": "Marco",
    "areaZona": null,
    "rawZona": null,
    "actividad": "LIDER",
    "asistencia": "V"
  },
  {
    "id": "base-66",
    "name": "Olga",
    "areaZona": null,
    "rawZona": null,
    "actividad": "LIDER",
    "asistencia": "F"
  },
  {
    "id": "base-67",
    "name": "Carlos",
    "areaZona": null,
    "rawZona": null,
    "actividad": "LIDER",
    "asistencia": null
  },
  {
    "id": "base-68",
    "name": "Idalia",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "LIDER",
    "asistencia": "A"
  },
  {
    "id": "base-69",
    "name": "David",
    "areaZona": null,
    "rawZona": null,
    "actividad": "TC",
    "asistencia": "F"
  },
  {
    "id": "base-70",
    "name": "Axel",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "TC",
    "asistencia": "A"
  },
  {
    "id": "base-71",
    "name": "Brayan",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "TC",
    "asistencia": "A"
  },
  {
    "id": "base-72",
    "name": "Williams",
    "areaZona": null,
    "rawZona": null,
    "actividad": "TC",
    "asistencia": "F"
  },
  {
    "id": "base-73",
    "name": "Juan",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "TG",
    "asistencia": "A"
  },
  {
    "id": "base-74",
    "name": "Jose",
    "areaZona": null,
    "rawZona": null,
    "actividad": "TG",
    "asistencia": "F"
  },
  {
    "id": "base-75",
    "name": "Nathalie",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "E",
    "asistencia": "A"
  },
  {
    "id": "base-76",
    "name": "Yusley",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "E",
    "asistencia": "A"
  },
  {
    "id": "base-77",
    "name": "Mary Dd",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "C",
    "asistencia": "A"
  },
  {
    "id": "base-78",
    "name": "Juany",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "PC",
    "asistencia": "A"
  },
  {
    "id": "base-79",
    "name": "Damaris",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS4",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-80",
    "name": "Karen",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS3",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-81",
    "name": "Daniel",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS0",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-82",
    "name": "Esmeralda",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS4",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-83",
    "name": "Angela",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS2",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-84",
    "name": "Emiret",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS1",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-85",
    "name": "Evelyn",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS5",
    "actividad": "SA",
    "asistencia": "A"
  },
  {
    "id": "base-86",
    "name": "Gustavo",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-87",
    "name": "Janeth",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": "F"
  },
  {
    "id": "base-88",
    "name": "Alondra",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD1",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-89",
    "name": "Beckham",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD11",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-90",
    "name": "Patricia",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD12",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-91",
    "name": "Gabriela",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD2",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-92",
    "name": "Daniela",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD3",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-93",
    "name": "Jeser",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD4",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-94",
    "name": "Badillo",
    "areaZona": "CAPACITACION",
    "rawZona": "CAPACITACION",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-95",
    "name": "Luis",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": "F"
  },
  {
    "id": "base-96",
    "name": "Jovani",
    "areaZona": "DMT",
    "rawZona": "DMT",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-97",
    "name": "Mireya",
    "areaZona": "LIMPIEZA",
    "rawZona": "LIMPIEZA",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-98",
    "name": "Sofia",
    "areaZona": "LIMPIEZA",
    "rawZona": "LIMPIEZA",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-99",
    "name": "Elias",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-100",
    "name": "Paulino",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-101",
    "name": "Roman",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-102",
    "name": "Luis",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-103",
    "name": "Rodrigo",
    "areaZona": "SOPORTE",
    "rawZona": "SOPORTE",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-104",
    "name": "Blaise",
    "areaZona": "SOPORTE",
    "rawZona": "SOPORTE",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-105",
    "name": "Cain",
    "areaZona": "SUPERVISOR",
    "rawZona": "SUPERVISOR",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-106",
    "name": "Diego",
    "areaZona": "TEAM_LEADER",
    "rawZona": "TEAM LEADER",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-107",
    "name": "Jonhatan",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": null
  },
  {
    "id": "base-108",
    "name": "Angel",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": "F"
  },
  {
    "id": "base-109",
    "name": "Brayan",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-110",
    "name": "Genaro",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-111",
    "name": "Juan B",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": "I"
  },
  {
    "id": "base-112",
    "name": "Jonathan",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD6",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-113",
    "name": "Kelly",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": "V"
  },
  {
    "id": "base-114",
    "name": "Denilson",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-115",
    "name": "Mauricio",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-116",
    "name": "Alexis",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": null,
    "asistencia": "A"
  }
]
