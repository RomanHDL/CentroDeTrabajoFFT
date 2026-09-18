// Utilidad de semana ISO-8601 CONSOLIDADA (2026-09-17, Dashboard FFT -- a peticion explicita del
// usuario: "revisar utilidades existentes primero, reutilizar si existen; si no, implementar
// semana ISO correctamente"). Ya existian 2 copias casi identicas del mismo algoritmo
// (src/data/demoras/exportExcel.js e src/data/production/excelExport.js) -- se revisaron primero:
// el algoritmo real ahi (semana empieza lunes, semana 1 = la que contiene el primer jueves del
// año, via el "metodo Jan-4") YA es correcto para el cruce de año, verificado a mano abajo con
// fechas reales. No tenian bug que corregir, asi que en vez de triplicarlo por tercera vez para
// este modulo nuevo, se consolida AQUI como unica fuente para codigo nuevo. Los 2 archivos
// originales NO se tocan (siguen siendo autosuficientes, cambiarlos esta fuera de alcance de esta
// tarea -- no romper Demoras/exportExcel de Producción por una refactorizacion no pedida).
//
// Vive en shared/ (no en src/ ni server-lib/) porque, igual que moduleRegistry.js/permissions.js,
// debe ser importable tanto desde el frontend (Vite) como desde api/**/server-lib/** (Node ESM) --
// por eso es codigo puro, sin dayjs/React/DB.
//
// Todas las fechas de este modulo son "fecha calendario" en UTC medianoche (mismo patron ya usado
// en todayDateOnly()/parseDateOnly() de server-lib/personnel.js) -- nunca un instante con hora,
// para que sumar/restar dias nunca dependa de la zona horaria del proceso que lo ejecuta.

export function dateOnly(isoDateString) {
  return new Date(`${isoDateString}T00:00:00.000Z`)
}

export function toDateOnlyString(date) {
  return date.toISOString().slice(0, 10)
}

export function addDays(date, days) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

// 0=Lunes..6=Domingo -- a diferencia de Date.getUTCDay() (0=Domingo), mismo criterio ya usado en
// buildWeeklyComparison (api/production/fft-summary.js).
export function isoWeekday(date) {
  return (date.getUTCDay() + 6) % 7
}

export function startOfIsoWeek(date) {
  return addDays(date, -isoWeekday(date))
}

// {isoYear, isoWeek} de una fecha -- isoYear puede diferir del año calendario de `date` en los
// primeros/ultimos dias del año (ej. 31-dic puede caer en la semana 1 del isoYear siguiente, y
// 1-ene puede caer en la semana 52/53 del isoYear anterior). Metodo Jan-4 real de ISO-8601,
// identico al ya verificado en produccion (excelExport.js x2): se desplaza `date` al jueves de su
// misma semana ISO (jueves siempre cae en el mismo isoYear que su semana), y se cuenta cuantas
// semanas completas hay entre ese jueves y el 4 de enero de ese mismo año (el 4 de enero SIEMPRE
// esta en la semana 1, por definicion de la norma).
export function isoWeekInfo(date) {
  const thursday = addDays(date, 3 - isoWeekday(date))
  const isoYear = thursday.getUTCFullYear()
  const firstThursdayYear = new Date(Date.UTC(isoYear, 0, 4))
  const firstThursday = addDays(firstThursdayYear, 3 - isoWeekday(firstThursdayYear))
  const diffDays = Math.round((thursday.getTime() - firstThursday.getTime()) / 86400000)
  return { isoYear, isoWeek: 1 + Math.round(diffDays / 7) }
}

// Inverso de isoWeekInfo: Lunes real de un (isoYear, isoWeek) dado. El 4 de enero de isoYear
// siempre esta en la semana 1 -- su Lunes es el Lunes de la semana 1; se avanzan (isoWeek-1)
// semanas desde ahi.
export function mondayOfIsoWeek(isoYear, isoWeek) {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const week1Monday = startOfIsoWeek(jan4)
  return addDays(week1Monday, (isoWeek - 1) * 7)
}

export function daysInMonth(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
}

// Todas las semanas ISO reales que TOCAN un mes calendario (>= 1 dia dentro del mes) -- puede ser
// 4, 5 o 6 segun el mes/año (nunca se asume un numero fijo, a peticion explicita del usuario).
// Recorre dia por dia el mes (nunca mas de 31 iteraciones) y colecciona semanas unicas en el
// orden en que aparecen (ya es orden cronologico).
export function isoWeeksTouchingMonth(year, monthIndex0) {
  const lastDay = daysInMonth(year, monthIndex0)
  const seen = new Set()
  const weeks = []
  for (let day = 1; day <= lastDay; day += 1) {
    const d = new Date(Date.UTC(year, monthIndex0, day))
    const { isoYear, isoWeek } = isoWeekInfo(d)
    const key = `${isoYear}-${isoWeek}`
    if (seen.has(key)) continue
    seen.add(key)
    const monday = mondayOfIsoWeek(isoYear, isoWeek)
    weeks.push({ isoYear, isoWeek, monday, sunday: addDays(monday, 6) })
  }
  return weeks
}

/* Casos de prueba reales verificados a mano (documentados aqui porque este modulo no tiene un
   archivo de test propio en el repo -- ver PRUEBAS OBLIGATORIAS del Dashboard FFT):
   - isoWeekInfo(dateOnly('2026-09-17')) -> { isoYear: 2026, isoWeek: 38 } (miercoles 17-sep-2026
     esta en la semana que va del lunes 14 al domingo 20 -- semana 38 del año, coincide con "hoy"
     real de esta tarea).
   - Cruce diciembre/enero: dateOnly('2029-12-31') (lunes) -> semana 1 de isoYear 2030 (el primer
     jueves de 2030 es 3-ene-2030, esa semana empieza el lunes 31-dic-2029). dateOnly('2027-01-01')
     (viernes) -> semana 53 de isoYear 2026 (el primer jueves de 2027 es 7-ene-2027, asi que el
     1-ene-2027 todavia cae en la ultima semana de 2026). Ambos casos dependen de isoYear !=
     date.getUTCFullYear(), que es justo lo que este modulo calcula por separado del año
     calendario. */
