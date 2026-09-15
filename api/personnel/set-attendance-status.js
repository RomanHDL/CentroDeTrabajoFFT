// "Marcar falta" en el layout FFT (2026-09-15, a peticion explicita del usuario) -- SEPARA
// asignacion de asistencia: esto SOLO escribe Attendance.status de hoy (server-lib/personnel.js,
// setDailyAttendanceStatus), nunca toca DailyAssignment. Reutiliza el AttendanceStatus real que
// ya existia en el schema (PRESENTE/AUSENTE/RETARDO) -- ningun estado paralelo nuevo. La persona
// sigue siendo la titular real de su puesto sin importar cuantas veces se marque/corrija aqui.
import { requireAuth } from '../../server-lib/auth.js'
import { setDailyAttendanceStatus } from '../../server-lib/personnel.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId, status } = req.body || {}
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId.' })

  const result = await setDailyAttendanceStatus({ employeeId, status, actingUserId: req.user.id })

  if (result.status === 'NOT_FOUND')
    return res.status(404).json({ error: 'Empleado no encontrado.' })
  if (result.status === 'INVALID_STATUS')
    return res.status(400).json({ error: 'Estado de asistencia inválido.' })

  return res.status(200).json({ attendance: result.attendance })
})
