/* ─────────────────────────────────────────────
   EmployeeSkill — de que estaciones esta capacitado un
   empleado. NO implica que este asignado ahi hoy.

   Solo el padron base (EMPLOYEE_DIRECTORY) trae habilidades
   semilla, deterministas, para que "Personal sugerido"
   tenga datos reales desde el primer uso. Las altas nuevas
   (alta minima numero+nombre) empiezan sin habilidades
   registradas hasta que alguien las capture — no se
   inventan habilidades para gente que acabamos de conocer.
   ───────────────────────────────────────────── */

import { STATIONS } from '../production/catalog'
import { mulberry32, pick } from './prng'
import { EMPLOYEE_DIRECTORY } from './directory'

export const SKILL_LEVELS = ['PUEDE_CUBRIR', 'INTERMEDIO', 'EXPERTO']

function buildSeedSkills() {
  const rng = mulberry32(20260819)
  const list = []
  EMPLOYEE_DIRECTORY.forEach((emp) => {
    const count = 2 + Math.floor(rng() * 3) // 2 a 4 habilidades
    const chosen = new Set()
    let guard = 0
    while (chosen.size < count && guard < 30) {
      chosen.add(pick(rng, STATIONS))
      guard += 1
    }
    chosen.forEach((stationName) => {
      list.push({
        id: `seed-skill-${emp.employeeNumber}-${stationName}`,
        employeeId: emp.id,
        stationName,
        level: 'PUEDE_CUBRIR',
        active: true,
        createdAt: null,
      })
    })
  })
  return list
}

export const SEED_SKILLS = buildSeedSkills()
