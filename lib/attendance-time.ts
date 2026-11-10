import { localDateISO, localTimeHM } from "./utils"

/** Tope diario de asistencia de un monitor. */
export const MAX_ATTENDANCE_MINUTES = 4 * 60

export function todayLocal(date = new Date()): { fecha: string; hora: string } {
  return { fecha: localDateISO(date), hora: localTimeHM(date) }
}

function hmToMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

/**
 * Minutos entre la entrada y la salida.
 * El mismo día no cruza medianoche: si el reloj retrocedió, cuenta 0.
 * Si la salida es de un día posterior, suma la noche y el tope diario la recorta a 4 h.
 */
export function minutesBetweenHM(
  start: string,
  end: string,
  fechaInicio?: string,
  fechaFin?: string,
): number {
  const startMin = hmToMinutes(start)
  const endMin = hmToMinutes(end)
  if (fechaInicio && fechaFin && fechaFin > fechaInicio) {
    return 24 * 60 - startMin + endMin
  }
  return Math.max(0, endMin - startMin)
}

export function addMinutesToHM(hora: string, minutes: number): string {
  const [h, m] = hora.split(":").map(Number)
  const total = h * 60 + m + minutes
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0")
  const mm = String(normalized % 60).padStart(2, "0")
  return `${hh}:${mm}`
}

/** La duración guardada nunca supera 4 horas. La salida queda en la entrada + 4 h si se pasó. */
export function applyDailyAttendanceCap(
  horaEntrada: string,
  horaSalidaReal: string,
  fechaEntrada?: string,
  fechaSalida?: string,
): {
  horaSalida: string
  duracionMinutos: number
  capped: boolean
} {
  const elapsed = minutesBetweenHM(horaEntrada, horaSalidaReal, fechaEntrada, fechaSalida)
  if (elapsed > MAX_ATTENDANCE_MINUTES) {
    return {
      horaSalida: addMinutesToHM(horaEntrada, MAX_ATTENDANCE_MINUTES),
      duracionMinutos: MAX_ATTENDANCE_MINUTES,
      capped: true,
    }
  }
  return {
    horaSalida: horaSalidaReal,
    duracionMinutos: elapsed,
    capped: false,
  }
}

export function formatAttendanceMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

/** Lunes de la semana local que contiene `from`. El domingo pertenece a la semana que está terminando. */
export function startOfLocalWeek(from = new Date()): string {
  const d = new Date(from)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return localDateISO(d)
}

export function startOfLocalMonth(from = new Date()): string {
  return `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-01`
}
