import * as XLSX from "xlsx"
import type { UserProfile } from "./types"
import type { UserServiceUsage } from "./storage"
import { resolveSede, SEDE_LABELS, type Sede } from "./sede"

function inDateRange(fecha: string, fechaDesde?: string, fechaHasta?: string): boolean {
  if (fechaDesde && fecha < fechaDesde) return false
  if (fechaHasta && fecha > fechaHasta) return false
  return true
}

/** Sede(s) donde el usuario registró actividad en el rango de fechas. */
export async function buildUserSedeLabels(
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<Record<string, string>> {
  const { getEntries, getAllLockers } = await import("./storage")
  const { getAllTableTennisLoans, getAllTableTennisAccess } = await import("./table-tennis-storage")

  const userSedes = new Map<string, Set<Sede>>()

  const addSede = (userId: string | undefined, sede?: string | null) => {
    if (!userId) return
    const resolved = resolveSede(sede)
    const set = userSedes.get(userId) ?? new Set<Sede>()
    set.add(resolved)
    userSedes.set(userId, set)
  }

  const [entries, lockers, tenisLoans, tenisAccess] = await Promise.all([
    getEntries(),
    getAllLockers(),
    getAllTableTennisLoans(),
    getAllTableTennisAccess(),
  ])

  for (const entry of entries) {
    if (!inDateRange(entry.fecha, fechaDesde, fechaHasta)) continue
    addSede(entry.usuarioId, entry.sede)
  }

  for (const locker of lockers) {
    if (!inDateRange(locker.fechaIngreso, fechaDesde, fechaHasta)) continue
    addSede(locker.usuarioId, locker.sede)
  }

  for (const loan of tenisLoans) {
    if (!inDateRange(loan.fecha, fechaDesde, fechaHasta)) continue
    addSede(loan.usuarioId ?? loan.usuario1Id, loan.sede)
    addSede(loan.usuario2Id, loan.sede)
  }

  for (const access of tenisAccess) {
    if (!inDateRange(access.fecha, fechaDesde, fechaHasta)) continue
    addSede(access.usuarioId, access.sede)
  }

  const result: Record<string, string> = {}
  for (const [userId, sedes] of userSedes) {
    result[userId] = Array.from(sedes)
      .map((s) => SEDE_LABELS[s])
      .join(" / ")
  }
  return result
}

function upperName(name: string): string {
  return (name || "").trim().toUpperCase()
}

function buildUserUsageRow(
  user: UserProfile,
  usage: UserServiceUsage,
  selectedColumns: string[],
  includeGuardarropas: boolean,
  sedeByUser?: Record<string, string>,
) {
  const total =
    usage.gimnasio +
    usage.piscina +
    (includeGuardarropas ? usage.guardarropas : 0) +
    usage.tenis_mesa

  const row: Record<string, string | number> = {
    Nombres: upperName(user.nombres),
    Gimnasio: usage.gimnasio,
    Piscina: usage.piscina,
    "Tenis de mesa": usage.tenis_mesa,
    Total: total,
  }

  if (includeGuardarropas) {
    row.Guardarropas = usage.guardarropas
  }

  for (const key of selectedColumns) {
    switch (key) {
      case "codigoEstudiantil":
        row["Código"] = user.codigoEstudiantil ?? ""
        break
      case "numeroDocumento":
        row["Documento"] = user.numeroDocumento ?? ""
        break
      case "tipoDocumento":
        row["Tipo Doc."] = user.tipoDocumento ?? ""
        break
      case "genero":
        row["Género"] = user.genero ?? ""
        break
      case "estamento":
        row["Estamento"] = user.estamento ?? ""
        break
      case "facultad":
        row["Facultad"] = user.facultad || "N/A"
        break
      case "programaAcademico":
        row["Programa"] = user.programaAcademico || "N/A"
        break
      case "correo":
        row["Correo"] = user.correo ?? ""
        break
      case "telefono":
        row["Teléfono"] = user.telefono ?? ""
        break
      case "edad":
        row["Edad"] = user.edad ?? ""
        break
      case "sede":
        row["Sede"] = sedeByUser?.[user.id] ?? ""
        break
    }
  }

  return row
}

function orderColumns(
  rows: Record<string, string | number>[],
  selectedColumns: string[],
  includeGuardarropas: boolean,
): Record<string, string | number>[] {
  const optionalLabels: Record<string, string> = {
    codigoEstudiantil: "Código",
    numeroDocumento: "Documento",
    tipoDocumento: "Tipo Doc.",
    genero: "Género",
    estamento: "Estamento",
    facultad: "Facultad",
    programaAcademico: "Programa",
    correo: "Correo",
    telefono: "Teléfono",
    edad: "Edad",
    sede: "Sede",
  }

  const columnOrder = [
    "Nombres",
    ...selectedColumns.map((key) => optionalLabels[key]).filter(Boolean),
    "Gimnasio",
    "Piscina",
    ...(includeGuardarropas ? ["Guardarropas"] : []),
    "Tenis de mesa",
    "Total",
  ]

  return rows.map((row) => {
    const ordered: Record<string, string | number> = {}
    for (const col of columnOrder) {
      if (col in row) ordered[col] = row[col]
    }
    return ordered
  })
}

export function filterUsersByAcademic(
  users: UserProfile[],
  opts?: { facultad?: string; programa?: string },
): UserProfile[] {
  if (!opts?.facultad && !opts?.programa) return users
  return users.filter((u) => {
    if (opts.facultad && opts.facultad !== "TODOS" && u.facultad !== opts.facultad) return false
    if (
      opts.programa &&
      opts.programa !== "TODOS" &&
      u.programaAcademico !== opts.programa
    ) {
      return false
    }
    return true
  })
}

export function exportUsersUsageExcel(
  users: UserProfile[],
  usageByUser: Record<string, UserServiceUsage>,
  selectedColumns: string[] = [],
  opts?: {
    fileSuffix?: string
    onlyWithUsage?: boolean
    minUsageKey?: keyof UserServiceUsage
    includeGuardarropas?: boolean
    facultad?: string
    programa?: string
    sedeByUser?: Record<string, string>
  },
) {
  const includeGuardarropas = opts?.includeGuardarropas !== false
  let cohort = filterUsersByAcademic(users, {
    facultad: opts?.facultad,
    programa: opts?.programa,
  })

  const rows = cohort
    .map((user) => {
      const usage = usageByUser[user.id] ?? {
        gimnasio: 0,
        piscina: 0,
        guardarropas: 0,
        tenis_mesa: 0,
      }
      return buildUserUsageRow(user, usage, selectedColumns, includeGuardarropas, opts?.sedeByUser)
    })
    .filter((row) => {
      if (opts?.minUsageKey) {
        const label =
          opts.minUsageKey === "tenis_mesa"
            ? "Tenis de mesa"
            : opts.minUsageKey.charAt(0).toUpperCase() + opts.minUsageKey.slice(1)
        return Number(row[label] ?? 0) > 0
      }
      if (opts?.onlyWithUsage !== false) {
        return Number(row.Total ?? 0) > 0
      }
      return true
    })
    .sort((a, b) => {
      const totalDiff = Number(b.Total) - Number(a.Total)
      if (totalDiff !== 0) return totalDiff
      return String(a.Nombres).localeCompare(String(b.Nombres), "es")
    })

  const orderedRows = orderColumns(rows, selectedColumns, includeGuardarropas)
  const ws = XLSX.utils.json_to_sheet(orderedRows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios por espacio")

  const date = new Date().toISOString().split("T")[0]
  const suffix = opts?.fileSuffix ? `_${opts.fileSuffix}` : ""
  XLSX.writeFile(wb, `usuarios_ingresos_por_espacio${suffix}_${date}.xlsx`)
}

export type GymExcelOptionalColumn =
  | "codigoEstudiantil"
  | "numeroDocumento"
  | "tipoDocumento"
  | "genero"
  | "estamento"
  | "facultad"
  | "programaAcademico"
  | "correo"
  | "telefono"
  | "edad"
  | "sede"

export const GYM_EXCEL_OPTIONAL_COLUMNS: { key: GymExcelOptionalColumn; label: string }[] = [
  { key: "codigoEstudiantil", label: "Código" },
  { key: "numeroDocumento", label: "Documento" },
  { key: "tipoDocumento", label: "Tipo Doc." },
  { key: "genero", label: "Género" },
  { key: "estamento", label: "Estamento" },
  { key: "facultad", label: "Facultad" },
  { key: "programaAcademico", label: "Programa" },
  { key: "correo", label: "Correo" },
  { key: "telefono", label: "Teléfono" },
  { key: "edad", label: "Edad" },
  { key: "sede", label: "Sede" },
]

export function usageKeyFromFiltro(
  filtro: "todas" | "gimnasio" | "piscina" | "tenis_mesa",
): keyof UserServiceUsage | undefined {
  if (filtro === "todas") return undefined
  if (filtro === "tenis_mesa") return "tenis_mesa"
  return filtro
}
