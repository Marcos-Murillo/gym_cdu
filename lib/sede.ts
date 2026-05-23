import type { SystemUser, UserRole } from "./types"

/** Sedes operativas en CDUControl (slug en Firestore). */
export const SEDES_ACTIVAS = ["melendez", "san_fernando"] as const
export type Sede = (typeof SEDES_ACTIVAS)[number]

export const DEFAULT_SEDE: Sede = "melendez"

export const SEDE_LABELS: Record<Sede, string> = {
  melendez: "Melendez",
  san_fernando: "San Fernando",
}

/** Filtro de estadísticas / PDF: una sede o todas (solo superadmin). */
export type SedeFiltro = Sede | "todas"

const ALIASES: Record<string, Sede> = {
  melendez: "melendez",
  meléndez: "melendez",
  "san fernando": "san_fernando",
  sanfernando: "san_fernando",
}

export function resolveSede(value?: string | null): Sede {
  if (!value) return DEFAULT_SEDE
  const key = value.trim().toLowerCase().replace(/\s+/g, " ")
  if (key in ALIASES) return ALIASES[key]
  const slug = key.replace(/\s+/g, "_")
  if (slug in ALIASES) return ALIASES[slug]
  if (SEDES_ACTIVAS.includes(slug as Sede)) return slug as Sede
  return DEFAULT_SEDE
}

export function canViewAllSedes(rol: UserRole): boolean {
  return rol === "superadmin"
}

/** Sede del staff que opera el kiosco; documentos legacy sin campo → Melendez. */
export function getStaffSede(user: SystemUser | null | undefined): Sede {
  if (!user) return DEFAULT_SEDE
  return resolveSede(user.sede)
}

export function getSedeForNewStaff(
  creator: SystemUser,
  requested?: Sede,
): Sede {
  if (canViewAllSedes(creator.rol) && requested) return requested
  return getStaffSede(creator)
}

export function filterBySede<T extends { sede?: string }>(
  items: T[],
  sedeFiltro?: SedeFiltro,
): T[] {
  if (!sedeFiltro || sedeFiltro === "todas") return items
  const target = resolveSede(sedeFiltro)
  return items.filter((item) => resolveSede(item.sede) === target)
}

export function sedeFromQueryParam(param: string | null): Sede {
  if (!param) return DEFAULT_SEDE
  return resolveSede(param)
}
