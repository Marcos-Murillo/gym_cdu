import type { Sede, SedeFiltro } from "./sede"
import { getStaffSede, resolveSede } from "./sede"
import type { SystemUser } from "./types"

export const SF_SEDE: Sede = "san_fernando"

export function isSanFernandoSede(sede?: string | null): boolean {
  return resolveSede(sede) === SF_SEDE
}

export function isSanFernandoStaff(user: SystemUser | null | undefined): boolean {
  if (!user) return false
  return getStaffSede(user) === SF_SEDE
}

/** Meléndez: 8 mesas × 2 raquetas fijas. San Fernando: inventario dinámico. */
export function usesFixedTableTennisInventory(sede?: string | null): boolean {
  return !isSanFernandoSede(sede)
}

export function guardarropasAppliesToSede(sedeFiltro?: SedeFiltro): boolean {
  if (!sedeFiltro || sedeFiltro === "todas") return true
  return !isSanFernandoSede(sedeFiltro)
}
