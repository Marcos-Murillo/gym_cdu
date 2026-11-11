/** Punto del CDU tomado en Google Maps. El navegador usa el mismo sistema (WGS84). */
export const CDU_LAT = 3.370776
export const CDU_LNG = -76.532996
export const CDU_RADIUS_METERS = 100

export type DevicePosition = {
  latitud: number
  longitud: number
  precisionMetros: number
}

export class OutsideCduError extends Error {
  distanceMeters: number
  accuracyMeters: number

  constructor(distanceMeters: number, accuracyMeters: number) {
    const metros = Math.max(1, Math.round(distanceMeters))
    const margen = Math.max(1, Math.round(accuracyMeters))
    super(
      `Estás a ${metros} m del CDU. La asistencia solo se puede marcar dentro de ${CDU_RADIUS_METERS} m. El navegador reporta un margen de ±${margen} m.`,
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

export function assertInsideCdu(position: DevicePosition): void {
  const distance = distanceMeters(position.latitud, position.longitud, CDU_LAT, CDU_LNG)
  if (distance > CDU_RADIUS_METERS) {
    throw new OutsideCduError(distance, position.precisionMetros)
  }
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

export async function requirePositionAtCdu(): Promise<DevicePosition> {
  const position = await readDevicePosition()
  assertInsideCdu(position)
  return position
}
