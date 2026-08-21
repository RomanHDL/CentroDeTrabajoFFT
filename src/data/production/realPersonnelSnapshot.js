/* ────────────────────────────────────────────
   Snapshot REAL de personal. La base son las 116 filas extraidas de
   LAYOUT FFT.xlsx (hoja BASE) el 2026-08-18, ninguna inventada
   (ids "base-N"). A partir del 2026-08-20 se agregaron ademas
   personas que SOLO existen en "ASISTENCIA FFT SEM 34.xlsx" y no
   tenian ninguna fila equivalente en BASE (ids "sem34-N") — ver mas
   abajo.

   - name: EMPLEADO tal como viene en el Excel (Title Case para lectura).
   - areaZona: ZONA normalizada al catalogo de areas (catalog.js). null si
     no se conoce una zona para esa persona (ausente/sin ubicacion actual).
   - rawZona: ZONA exactamente como aparece en el Excel de origen, sin
     normalizar (ej. "ACCESORIOS3", "CALIDAD11", "Chofer") — se conserva
     para no perder informacion, aunque areaZona ya la agrupo razonablemente.
   - actividad/asistencia: codigos crudos de BASE (2026-08-18), SIN
     interpretar significado. Solo existen para gente "base-N"; el
     personal "sem34-N" no participo del snapshot de BASE, por lo que
     no tiene estos dos campos.
   - fechaIngreso: fecha de ingreso tal como viene en SEM 34 ("DD/MM/AAAA"),
     sin interpretar. null cuando SEM 34 no la trae para esa persona.

   BASE no tiene columna de numero de empleado. El cruce contra SEM 34
   ("Asistencia FFT SEM 34", semana del 17-21/08/2026) se hizo en 3
   rondas (scripts/_match-employee-numbers-tmp.mjs, _match2-tmp.mjs y
   _apply-sem34-roster-tmp.mjs, todos temporales, no versionados). Solo
   se agrego `employeeNumber`/nombre completo cuando la coincidencia
   fue INEQUIVOCA: un unico candidato con ese nombre, validado por area
   compatible entre ambas hojas Y/O por el codigo de asistencia del
   18/08 coincidiendo en ambas hojas. `employeeNumber` solo se puso
   cuando SEM 34 tenia numero real (no "Proyecto"/"Nuevo"/vacio); si el
   nombre quedo confirmado pero sin numero real todavia, se actualizo
   solo el nombre (y ahora tambien la fecha de ingreso, si la hay).

   Ronda 1: 42 de 116 resueltos (nombre + numero).
   Ronda 2: 22 mas (8 con numero real + nombre, 14 solo nombre completo).
   Ronda 3 (2026-08-20, con la lista completa de SEM 34 nombre+numero+
   fecha de ingreso que dio el usuario): 19 resoluciones nuevas +
   fecha de ingreso para 76 personas (66 via numero de empleado ya
   conocido, 10 a mano para quienes SEM 34 aun no trae numero real) +
   20 personas agregadas que NO estaban en BASE (ids "sem34-1".."sem34-20":
   la mayoria en "Produccion" generico, sin decir que linea especifica,
   por eso su areaZona queda como texto libre "PRODUCCION" en vez de
   inventar una linea — no aparecen en el layout, solo en el modulo de
   Personal).

   Ronda 4 (2026-08-21, a peticion del usuario de "agregar a todos los
   de semana 34" y revisar "LAYOUT FFT.xlsx" por si mostraba donde esta
   cada quien mas habitualmente): se releyo LAYOUT FFT.xlsx completo,
   las 3 hojas (LAYOUT, "BASE ", BAJAS). La hoja "LAYOUT" es un dibujo
   visual del piso que solo REPRODUCE la misma pareja ZONA+EMPLEADO que
   ya trae la hoja BASE (se verifico cruzando varias posiciones
   contra los datos ya importados — coinciden exactamente, ej. los 7
   nombres bajo "LINEA 1" son los mismos 7 que ya tienen areaZona
   LINEA 1 aqui) — NO trae una columna ni señal nueva para saber cual
   "Luis"/"Juan"/"Ricardo"/"Jesus" especifico es cual: sigue siendo el
   mismo primer nombre repetido, sin apellido, en ambas hojas. Por eso
   NO se pudo desambiguar ningun caso adicional de nombre repetido con
   este archivo — no se inventa ni se adivina cual es cual.
   Se releyo tambien "ASISTENCIA FFT SEM 34.xlsx" completo (las 113
   filas de la hoja "Asistencia FFT SEM 34", con TODAS sus columnas de
   dia 17-21/08, no solo el 18/08) y se comparo cada fila (por numero
   y por nombre exacto) contra este snapshot: de las 113, 105 ya
   estaban capturadas de rondas anteriores; las 8 que faltaban eran
   exactamente las mismas 7 personas "baja" de mas abajo (con
   evidencia fuerte otra vez, sin tocarlas, mismo motivo que antes) +
   1 caso nuevo real: "Sandra" (base-56, ACCESORIOS) se resolvio a
   Sandra Iveth Barrón Marinez (#2446, Accesorios, unico candidato sin
   ambiguedad). Con esto, TODAS las filas de SEM 34 semana 34 quedan
   reflejadas en este snapshot (via numero, nombre, o la excepcion de
   baja) — no quedo ninguna persona de esa hoja sin capturar.
   Total resuelto con nombre/numero: 84 de 136 (el total de personas
   no cambio esta ronda, solo se completo a Sandra). Quedan sin este dato
   los ~24 casos de BASE cuyo nombre corto es ambiguo (varios
   "Luis"/"Juan"/"Ricardo"/"Jesus"/"Alfredo"/etc. con mas de un
   candidato posible en SEM 34): en TODOS esos casos, el/los
   candidato(s) de SEM 34 con ese nombre YA se agregaron como personas
   nuevas separadas (ids "sem34-N", rondas 3-4, ver el bloque de mas
   abajo) porque no habia forma segura de saber a cual "base-N"
   especifico correspondia cada uno — reabrir esa asignacion ahora
   seria adivinar, no se hace. Es decir, esas personas de SEM 34 SI
   estan en el sistema, solo que como registro nuevo aparte en vez de
   completar el nombre corto de BASE.

   Hallazgo informativo de la hoja BAJAS de LAYOUT FFT.xlsx (13
   nombres sueltos marcados "BAJA" con fecha, sin apellido ni numero,
   por lo que NO se pudo cruzar con certeza contra nadie de este
   snapshot): coincide en primer nombre con varios casos ya conocidos
   o sospechados — "JOSE" (refuerza la anomalia ya detectada en Ronda
   1/2 de que Jose Sanchez/base-74/#3981 aparecia con "Baja" el 19/08
   en SEM 34), y ademas "ANTONIO", "ALEXIS", "JESUS" (x2), "BRAYAN" —
   pero como la hoja BAJAS no trae apellido ni numero, esto es solo
   una señal debil, no una confirmacion: NO se desactivo ni se toco a
   nadie por esto (base-17 Antonio Rocha Ipiña, base-116 Alexis,
   base-18/base-20 Jesus, base-71/base-109 Brayan siguen exactamente
   igual). Queda anotado para que el usuario lo revise si quiere.

   Excepcion deliberada: 8 personas ("baja") se dejan SIN TOCAR a
   peticion explicita del usuario (2026-08-19, reconfirmado 2026-08-20
   pese a que la lista de SEM 34 trae evidencia fuerte — nombre+numero+
   fecha — para 5 de las 8): Miguel/base-11, Reynaldo/base-12,
   Daniela/base-31, Socorro/base-32, Marco/base-65, Olga/base-66,
   Janeth/base-87, Jonhatan/base-107. No se debe reabrir esto sin que
   el usuario lo confirme.

   Areas nuevas "Chofer" e "Ingenieria" (SEM 34): por decision del
   usuario (2026-08-20) NO tienen bloque de layout — el personal ahi
   es elegible y buscable en el modulo de Personal, pero no aparece en
   el plano visual (areaZona no coincide con ningun id de catalog.js).

   "Roman Herrera de Leon" #3647 (area "Practicante" en SEM 34) es el
   usuario administrador de la app, no personal de piso — se excluye
   siempre de cualquier cruce (nunca se le asigna a "base-101 Roman",
   que es una persona real distinta de Paletizado).
   ──────────────────────────────────────────── */

export const BASE_SNAPSHOT_DATE = '2026-08-18'

export const REAL_PERSONNEL_SNAPSHOT = [
  {
    "id": "base-1",
    "name": "Aide Mendoza Gutierrez",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "LC",
    "asistencia": "A"
  },
  {
    "id": "base-2",
    "employeeNumber": "3842",
    "name": "Thelma Virginia Rodriguez Cissneros",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "18/06/2026"
  },
  {
    "id": "base-3",
    "employeeNumber": "3591",
    "name": "Rosa Maria Rodriguez Cruz",
    "areaZona": null,
    "rawZona": null,
    "actividad": "LC",
    "asistencia": "F",
    "fechaIngreso": "09/03/2026"
  },
  {
    "id": "base-4",
    "employeeNumber": "3844",
    "name": "Ezelin del Carmen Bohorquez",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "18/06/2026"
  },
  {
    "id": "base-5",
    "name": "Migdalia Georgina Ramirez Díaz",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "10/03/2026"
  },
  {
    "id": "base-6",
    "employeeNumber": "3866",
    "name": "Yailen Rodriguez Perez",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "29/06/2026"
  },
  {
    "id": "base-7",
    "employeeNumber": "3865",
    "name": "Yamilia Peraza Luna",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "29/06/2026"
  },
  {
    "id": "base-8",
    "employeeNumber": "3285",
    "name": "Francisca Elizabeth Delgado Perez",
    "areaZona": "SOPORTE",
    "rawZona": "SOPORTE",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "07/10/2025"
  },
  {
    "id": "base-9",
    "name": "Angie Neil Garrido Castellanos",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "LC",
    "asistencia": "A",
    "fechaIngreso": "27/12/2024"
  },
  {
    "id": "base-10",
    "employeeNumber": "2871",
    "name": "Jose Alfredo Morales Reyes",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "EM",
    "asistencia": "A",
    "fechaIngreso": "08/05/2025"
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
    "employeeNumber": "2898",
    "name": "Saúl Santiago Hernandez",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "EM",
    "asistencia": "A",
    "fechaIngreso": "15/05/2025"
  },
  {
    "id": "base-15",
    "employeeNumber": "3939",
    "name": "Elian Isai Rosas Regalado",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "EM",
    "asistencia": "A",
    "fechaIngreso": "28/07/2026"
  },
  {
    "id": "base-16",
    "name": "Ramiro Aguilar Rubio",
    "areaZona": null,
    "rawZona": null,
    "actividad": "EM",
    "asistencia": "F",
    "fechaIngreso": "08/06/2026"
  },
  {
    "id": "base-17",
    "name": "Antonio Rocha Ipiña",
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
    "employeeNumber": "3499",
    "name": "Pedro Alejandrez Quintero",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "EM",
    "asistencia": "A",
    "fechaIngreso": "04/12/2025"
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
    "employeeNumber": "3372",
    "name": "Diego Alberto Tamez Vazquez",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "EM",
    "asistencia": "A",
    "fechaIngreso": "13/10/2025"
  },
  {
    "id": "base-22",
    "name": "Cesar Hernandez Hernandez",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "EM",
    "asistencia": "A",
    "fechaIngreso": "03/02/2026"
  },
  {
    "id": "base-23",
    "employeeNumber": "3984",
    "name": "Francisco Gomez Cruz",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "05/08/2026"
  },
  {
    "id": "base-24",
    "employeeNumber": "3872",
    "name": "Lidia Esther Rivera Gomez",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "30/06/2026"
  },
  {
    "id": "base-25",
    "employeeNumber": "3470",
    "name": "Patricia Obregón Cerdas",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "09/06/2026"
  },
  {
    "id": "base-26",
    "employeeNumber": "2767",
    "name": "Gudelia Hernández Hernández",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "02/04/2025"
  },
  {
    "id": "base-27",
    "employeeNumber": "3580",
    "name": "Norma Deyanira Gonzalez Ramos",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS5",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "13/01/2026"
  },
  {
    "id": "base-28",
    "employeeNumber": "3101",
    "name": "Veronica Lopez Arroyo",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "27/09/2025"
  },
  {
    "id": "base-29",
    "employeeNumber": "3889",
    "name": "Sarah Estefania Juarez Alvarado",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "07/07/2026"
  },
  {
    "id": "base-30",
    "employeeNumber": "3864",
    "name": "Victor Gabriel Perez Perez",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "29/06/2026"
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
    "employeeNumber": "2626",
    "name": "Ulises Fernández Huerta",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "09/12/2024"
  },
  {
    "id": "base-34",
    "name": "Valentin Cruz Martinez",
    "areaZona": null,
    "rawZona": null,
    "actividad": "L",
    "asistencia": "F"
  },
  {
    "id": "base-35",
    "employeeNumber": "3871",
    "name": "Karol Patricia de la Rosa Perez",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "30/06/2026"
  },
  {
    "id": "base-36",
    "employeeNumber": "3891",
    "name": "Paula Edith Ovalle Gandara",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "07/07/2026"
  },
  {
    "id": "base-37",
    "employeeNumber": "3932",
    "name": "Alexis Gomez Jimenez",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "PE",
    "asistencia": "A",
    "fechaIngreso": "27/07/2026"
  },
  {
    "id": "base-38",
    "employeeNumber": "3559",
    "name": "Esly Suyapa Mata Licona",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "PE",
    "asistencia": "A",
    "fechaIngreso": "29/07/2026"
  },
  {
    "id": "base-39",
    "employeeNumber": "3555",
    "name": "Delfina Uribe Rodriguez",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "PE",
    "asistencia": "A",
    "fechaIngreso": "12/01/2026"
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
    "name": "Edgar Solis Cruz",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "L",
    "asistencia": "A",
    "fechaIngreso": "05/08/2026"
  },
  {
    "id": "base-42",
    "employeeNumber": "3540",
    "name": "Nancy Vazquez Arredondo",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "PE",
    "asistencia": "A",
    "fechaIngreso": "07/01/2026"
  },
  {
    "id": "base-43",
    "employeeNumber": "2945",
    "name": "Lourdes Dominguez Islas",
    "areaZona": "LINEA 4",
    "rawZona": "LINEA 4",
    "actividad": "PE",
    "asistencia": "A",
    "fechaIngreso": "27/05/2025"
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
    "employeeNumber": "3963",
    "name": "Bryan Uriel Hernandez Hernandez",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "M",
    "asistencia": "A",
    "fechaIngreso": "09/08/2026"
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
    "employeeNumber": "3924",
    "name": "Juan Eduardo Cuellar Ruiz",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F",
    "fechaIngreso": "23/07/2026"
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
    "employeeNumber": "3938",
    "name": "Hector Manuel Cisneros Sanchez",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "M",
    "asistencia": "A",
    "fechaIngreso": "28/07/2026"
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
    "name": "Kevin Alejandro Cira Ramirez",
    "areaZona": null,
    "rawZona": null,
    "actividad": "M",
    "asistencia": "F",
    "fechaIngreso": "08/11/2026"
  },
  {
    "id": "base-55",
    "name": "Jose Eleazar Hernandez",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "M",
    "asistencia": "A",
    "fechaIngreso": "08/12/2026"
  },
  {
    "id": "base-56",
    "employeeNumber": "2446",
    "name": "Sandra Iveth Barrón Marinez",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "17/02/2025"
  },
  {
    "id": "base-57",
    "employeeNumber": "2641",
    "name": "Jesus Ernesto Rivera Escobar",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "30/12/2024"
  },
  {
    "id": "base-58",
    "employeeNumber": "2570",
    "name": "Yessica Guadalupe Luna Barboza",
    "areaZona": "LINEA 1",
    "rawZona": "LINEA 1",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "26/08/2025"
  },
  {
    "id": "base-59",
    "employeeNumber": "3650",
    "name": "Lizbeth Esmeralda Monsiváis Rangel",
    "areaZona": "LINEA 2",
    "rawZona": "LINEA 2",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "26/02/2026"
  },
  {
    "id": "base-60",
    "employeeNumber": "3743",
    "name": "Evelin Yasmin Bautista Martinez",
    "areaZona": "LINEA 3",
    "rawZona": "LINEA 3",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "04/03/2026"
  },
  {
    "id": "base-61",
    "employeeNumber": "3310",
    "name": "Edgar Uriel Sanchez Morales",
    "areaZona": "LINEA 7",
    "rawZona": "LINEA 7",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "16/10/2025"
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
    "employeeNumber": "3085",
    "name": "Sandra Cecilia Perez Cruz",
    "areaZona": "CAPACITACION",
    "rawZona": "CAPACITACION",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "01/09/2025"
  },
  {
    "id": "base-64",
    "employeeNumber": "3912",
    "name": "Joshua Oscar Estrada",
    "areaZona": "LINEA 0",
    "rawZona": "LINEA 0",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "20/07/2026"
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
    "employeeNumber": "3595",
    "name": "Idalia Guereca Banda",
    "areaZona": "LINEA 5",
    "rawZona": "LINEA 5",
    "actividad": "LIDER",
    "asistencia": "A",
    "fechaIngreso": "14/01/2026"
  },
  {
    "id": "base-69",
    "employeeNumber": "3942",
    "name": "Jesus David Hernandez Zuniga",
    "areaZona": null,
    "rawZona": null,
    "actividad": "TC",
    "asistencia": "F",
    "fechaIngreso": "28/07/2026"
  },
  {
    "id": "base-70",
    "employeeNumber": "3860",
    "name": "Axel Uriel Cruz Mata",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "TC",
    "asistencia": "A",
    "fechaIngreso": "24/06/2026"
  },
  {
    "id": "base-71",
    "employeeNumber": "3237",
    "name": "Brayan Alejandro Lopez Ibarra",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "TC",
    "asistencia": "A"
  },
  {
    "id": "base-72",
    "employeeNumber": "3982",
    "name": "Wiliams de la Cruz",
    "areaZona": null,
    "rawZona": null,
    "actividad": "TC",
    "asistencia": "F",
    "fechaIngreso": "13/8/2028"
  },
  {
    "id": "base-73",
    "employeeNumber": "3818",
    "name": "Juan Bohorquez",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "TG",
    "asistencia": "A",
    "fechaIngreso": "07/06/2026"
  },
  {
    "id": "base-74",
    "employeeNumber": "3981",
    "name": "Jose Sanchez",
    "areaZona": null,
    "rawZona": null,
    "actividad": "TG",
    "asistencia": "F",
    "fechaIngreso": "13/8/2027"
  },
  {
    "id": "base-75",
    "name": "Nathalie del Valle Zapata Lopez",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "E",
    "asistencia": "A"
  },
  {
    "id": "base-76",
    "name": "Yusley Montes",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": "E",
    "asistencia": "A"
  },
  {
    "id": "base-77",
    "employeeNumber": "2718",
    "name": "Maria de Jesus de Dios Carrazo",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "C",
    "asistencia": "A",
    "fechaIngreso": "11/06/2025"
  },
  {
    "id": "base-78",
    "employeeNumber": "3086",
    "name": "Juana Mendrano Villanueva",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS",
    "actividad": "PC",
    "asistencia": "A",
    "fechaIngreso": "01/09/2025"
  },
  {
    "id": "base-79",
    "employeeNumber": "3719",
    "name": "Damaris Jael Barboza Yañez",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS4",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "10/02/2026"
  },
  {
    "id": "base-80",
    "employeeNumber": "3575",
    "name": "Karen Rivera Gomez",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS3",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "13/01/2026"
  },
  {
    "id": "base-81",
    "employeeNumber": "3361",
    "name": "Juan Daniel Gavidia Zavala",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS0",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "14/10/2025"
  },
  {
    "id": "base-82",
    "employeeNumber": "3626",
    "name": "Esmeralda Catalina Llanas Tinajero",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS4",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "21/01/2026"
  },
  {
    "id": "base-83",
    "employeeNumber": "3016",
    "name": "Angela Estrada Garcia",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS2",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "03/07/2026"
  },
  {
    "id": "base-84",
    "employeeNumber": "3678",
    "name": "Aglael Emiret Trujillo Reyes",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS1",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "03/02/2026"
  },
  {
    "id": "base-85",
    "employeeNumber": "3544",
    "name": "Evelyn Cristal Espinoza Uribe",
    "areaZona": "ACCESORIOS",
    "rawZona": "ACCESORIOS5",
    "actividad": "SA",
    "asistencia": "A",
    "fechaIngreso": "03/06/2026"
  },
  {
    "id": "base-86",
    "employeeNumber": "3489",
    "name": "Gustavo Israel Garibay García",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "26/11/2025"
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
    "employeeNumber": "3914",
    "name": "Daniela Ivonee Aguilar Sanchez",
    "areaZona": "CALIDAD",
    "rawZona": "CALIDAD3",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "19/07/2026"
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
    "employeeNumber": "2738",
    "name": "Arturo Badillo Santillán",
    "areaZona": "CAPACITACION",
    "rawZona": "CAPACITACION",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "25/03/2026"
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
    "employeeNumber": "3568",
    "name": "Angel Jovani Cruz Biviano",
    "areaZona": "DMT",
    "rawZona": "DMT",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "13/01/2026"
  },
  {
    "id": "base-97",
    "name": "Mireya Josefina Lopez Zapata",
    "areaZona": "LIMPIEZA",
    "rawZona": "LIMPIEZA",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "base-98",
    "employeeNumber": "3280",
    "name": "Sofia Ibañez Rodriguez",
    "areaZona": "LIMPIEZA",
    "rawZona": "LIMPIEZA",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "07/10/2025"
  },
  {
    "id": "base-99",
    "employeeNumber": "3133",
    "name": "Elias Hernádez Gallardo",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "19/09/2025"
  },
  {
    "id": "base-100",
    "employeeNumber": "2686",
    "name": "Paulino Cordoba Ulloa",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "19/05/2025"
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
    "employeeNumber": "3915",
    "name": "Luis Manuel de Jesus Faz Serrano",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "21/07/2026"
  },
  {
    "id": "base-103",
    "employeeNumber": "3401",
    "name": "Rodrigo Martinez Montes",
    "areaZona": "SOPORTE",
    "rawZona": "SOPORTE",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "28/07/2026"
  },
  {
    "id": "base-104",
    "name": "Estime Blaise",
    "areaZona": "SOPORTE",
    "rawZona": "SOPORTE",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "25/01/2026"
  },
  {
    "id": "base-105",
    "employeeNumber": "2701",
    "name": "Caín Bautista Rojas",
    "areaZona": "SUPERVISOR",
    "rawZona": "SUPERVISOR",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "08/03/2025"
  },
  {
    "id": "base-106",
    "employeeNumber": "2573",
    "name": "Diego Julián Marín Zamudio",
    "areaZona": "TEAM_LEADER",
    "rawZona": "TEAM LEADER",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "05/08/2024"
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
    "employeeNumber": "3977",
    "name": "Angel Ricardo Flores Vargas",
    "areaZona": null,
    "rawZona": null,
    "actividad": null,
    "asistencia": "F",
    "fechaIngreso": "05/08/2026"
  },
  {
    "id": "base-109",
    "employeeNumber": "3861",
    "name": "Brayan Alejandro Antonio Margarito",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "25/06/2026"
  },
  {
    "id": "base-110",
    "employeeNumber": "3841",
    "name": "Genaro Flores Zalazar",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "17/06/2026"
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
    "name": "Denilson Edilber Castro",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "27/12/2024"
  },
  {
    "id": "base-115",
    "name": "Mauricio Hernandez Clixtro",
    "areaZona": "PALETIZADO",
    "rawZona": "PALETIZADO",
    "actividad": null,
    "asistencia": "A",
    "fechaIngreso": "13/08/2026"
  },
  {
    "id": "base-116",
    "name": "Alexis",
    "areaZona": "CAJAS",
    "rawZona": "CAJAS",
    "actividad": null,
    "asistencia": "A"
  },
  {
    "id": "sem34-1",
    "employeeNumber": "3486",
    "name": "Sabina Sanchez Hernández",
    "areaZona": "ACCESORIOS",
    "rawZona": "Accesorios",
    "fechaIngreso": null
  },
  {
    "id": "sem34-2",
    "name": "Jose Francisco Franco Vara",
    "areaZona": "PALETIZADO",
    "rawZona": "Paletizado",
    "fechaIngreso": "17/08/2026"
  },
  {
    "id": "sem34-3",
    "employeeNumber": "3492",
    "name": "David Delfin Rodriguez",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "23/07/2026"
  },
  {
    "id": "sem34-4",
    "name": "Brayan Gonzalez Sanchez",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "17/06/2026"
  },
  {
    "id": "sem34-5",
    "employeeNumber": "3878",
    "name": "Jose Gustavo Aguilar Corpus",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "06/07/2026"
  },
  {
    "id": "sem34-6",
    "name": "Javier Aguilar De Dios",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "08/12/2026"
  },
  {
    "id": "sem34-7",
    "name": "Alexis Garcia Garcia",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "08/12/2026"
  },
  {
    "id": "sem34-8",
    "name": "Juan Hernandez Gonzalez",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "08/12/2026"
  },
  {
    "id": "sem34-9",
    "name": "Ricardo Yandel Sanchez Alviso",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "08/06/2026"
  },
  {
    "id": "sem34-10",
    "employeeNumber": "2888",
    "name": "Angel Ismael Romero Rojas",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "28/05/2026"
  },
  {
    "id": "sem34-11",
    "employeeNumber": "3736",
    "name": "Manuel Alejandro Ramos Barron",
    "areaZona": "CHOFER",
    "rawZona": "Chofer",
    "fechaIngreso": "27/02/2026"
  },
  {
    "id": "sem34-12",
    "employeeNumber": "2661",
    "name": "Diciembre Alfonso Alvarado",
    "areaZona": "CHOFER",
    "rawZona": "Chofer",
    "fechaIngreso": "22/06/2025"
  },
  {
    "id": "sem34-13",
    "employeeNumber": "2678",
    "name": "Jose Juan Bocanegra",
    "areaZona": "INGENIERIA",
    "rawZona": "Ingenieria",
    "fechaIngreso": "25/02/2025"
  },
  {
    "id": "sem34-14",
    "employeeNumber": "2663",
    "name": "Luis Hernandez Hernandez",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "05/08/2026"
  },
  {
    "id": "sem34-15",
    "employeeNumber": "3883",
    "name": "Luis Angel Rangel Espindola",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "07/07/2026"
  },
  {
    "id": "sem34-16",
    "employeeNumber": "3096",
    "name": "Luis Alfredo Salas Rocha",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": null
  },
  {
    "id": "sem34-17",
    "employeeNumber": "3188",
    "name": "Juan de Dios Arellano Rodriguez",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "26/06/2026"
  },
  {
    "id": "sem34-18",
    "employeeNumber": "2986",
    "name": "Juan Godinez Bautista",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "13/06/2026"
  },
  {
    "id": "sem34-19",
    "employeeNumber": "3885",
    "name": "Ricardo Antonio Rodriguez Guzman",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "07/07/2026"
  },
  {
    "id": "sem34-20",
    "employeeNumber": "3251",
    "name": "Jesus Perez Cruz",
    "areaZona": "PRODUCCION",
    "rawZona": "Produccion",
    "fechaIngreso": "10/10/2025"
  }
]
