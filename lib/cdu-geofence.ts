/** Punto del CDU tomado en Google Maps. El navegador usa el mismo sistema (WGS84). */
export const CDU_LAT = 3.370776
export const CDU_LNG = -76.532996
export const CDU_RADIUS_METERS = 100

/** Mesa de ping pong. Solo aplica a monitores de tenis de mesa. */
export const PING_PONG_LAT = 3.372871
export const PING_PONG_LNG = -76.534765
export const PING_PONG_RADIUS_METERS = 30

export type AttendanceSite = {
  nombre: string
  lat: number
  lng: number
  radiusMeters: number
}

export const CDU_SITE: AttendanceSite = {
  nombre: "CDU",
  lat: CDU_LAT,
  lng: CDU_LNG,
  radiusMeters: CDU_RADIUS_METERS,
}

export const PING_PONG_SITE: AttendanceSite = {
  nombre: "tenis de mesa",
  lat: PING_PONG_LAT,
  lng: PING_PONG_LNG,
  radiusMeters: PING_PONG_RADIUS_METERS,
}

export function attendanceSiteForEspacio(espacio?: string | null): AttendanceSite {
  if (espacio === "tenis_mesa") return PING_PONG_SITE
  return CDU_SITE
}

export type DevicePosition = {
  latitud: number
  longitud: number
  precisionMetros: number
}

export class OutsideCduError extends Error {
  distanceMeters: number
  accuracyMeters: number

  constructor(distanceMeters: number, accuracyMeters: number, site: AttendanceSite = CDU_SITE) {
    const metros = Math.max(1, Math.round(distanceMeters))
    const margen = Math.max(1, Math.round(accuracyMeters))
    super(
      `Estás a ${metros} m de ${site.nombre}. La asistencia solo se puede marcar dentro de ${site.radiusMeters} m. El navegador reporta un margen de ±${margen} m.`,
    )
    this.name = "OutsideCduError"
    this.distanceMeters = distanceMeters
    this.accuracyMeters = accuracyMeters
  }
}

export class LocationAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "LocationAccessError"
  }
}

/** Distancia en metros entre dos coordenadas WGS84. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earth = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function assertInsideAttendanceSite(position: DevicePosition, espacio?: string | null): void {
  const site = attendanceSiteForEspacio(espacio)
  const distance = distanceMeters(position.latitud, position.longitud, site.lat, site.lng)
  if (distance > site.radiusMeters) {
    throw new OutsideCduError(distance, position.precisionMetros, site)
  }
}

export function assertInsideCdu(position: DevicePosition): void {
  assertInsideAttendanceSite(position)
}

/** Lee el GPS/Wi‑Fi del dispositivo. Pide permiso de ubicación al navegador. */
export function readDevicePosition(): Promise<DevicePosition> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new LocationAccessError("Este navegador no puede leer la ubicación."))
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precisionMetros: pos.coords.accuracy,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new LocationAccessError("Activa el permiso de ubicación del navegador para marcar la asistencia."))
          return
        }
        if (err.code === err.TIMEOUT) {
          reject(new LocationAccessError("No se obtuvo la ubicación a tiempo. Activa el GPS e intenta de nuevo."))
          return
        }
        reject(new LocationAccessError("No se pudo leer la ubicación. Revisa que el GPS esté activo."))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  })
}

export async function requirePositionForEspacio(espacio?: string | null): Promise<DevicePosition> {
  const position = await readDevicePosition()
  assertInsideAttendanceSite(position, espacio)
  return position
}

export async function requirePositionAtCdu(): Promise<DevicePosition> {
  return requirePositionForEspacio()
}
