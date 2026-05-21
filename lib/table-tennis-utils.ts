export const TOTAL_MESAS = 8
export const TOTAL_RAQUETAS = 16
export const PRESTAMO_HORAS = 1

export function raquetasForMesa(mesa: number): [number, number] {
  const base = (mesa - 1) * 2 + 1
  return [base, base + 1]
}

export function mesaForRaqueta(raqueta: number): number {
  return Math.ceil(raqueta / 2)
}

export function nowDateTime(): { fecha: string; hora: string } {
  const now = new Date()
  return {
    fecha: now.toISOString().split("T")[0],
    hora: now.toTimeString().split(" ")[0],
  }
}

export function addHoursToHora(hora: string, hours: number): string {
  const [h, m, s] = hora.split(":").map(Number)
  const d = new Date()
  d.setHours(h, m, s || 0, 0)
  d.setTime(d.getTime() + hours * 60 * 60 * 1000)
  return d.toTimeString().split(" ")[0]
}

/** Minutos restantes; negativo si ya venció */
export function minutosRestantes(fecha: string, horaFin: string): number {
  const end = new Date(`${fecha}T${horaFin}`)
  return Math.floor((end.getTime() - Date.now()) / 60000)
}

export function prestamoVencido(fecha: string, horaFin: string): boolean {
  return minutosRestantes(fecha, horaFin) <= 0
}

export function formatMinutosRestantes(minutos: number): string {
  if (minutos <= 0) return "Tiempo agotado"
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
