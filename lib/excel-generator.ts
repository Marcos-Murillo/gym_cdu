import * as XLSX from "xlsx"
import type { UserProfile } from "./types"
import type { UserServiceUsage } from "./storage"

function upperName(name: string): string {
  return (name || "").trim().toUpperCase()
}

export function exportUsersUsageExcel(
  users: UserProfile[],
  usageByUser: Record<string, UserServiceUsage>,
  fileSuffix = "",
) {
  const rows = users.map((u) => {
    const usage = usageByUser[u.id] ?? {
      gimnasio: 0,
      piscina: 0,
      guardarropas: 0,
      tenis_mesa: 0,
    }
    const total =
      usage.gimnasio + usage.piscina + usage.guardarropas + usage.tenis_mesa

    return {
      Nombres: upperName(u.nombres),
      Código: u.codigoEstudiantil ?? "",
      Documento: u.numeroDocumento ?? "",
      "Tipo documento": u.tipoDocumento ?? "",
      Estamento: u.estamento ?? "",
      Facultad: u.facultad ?? "",
      Programa: u.programaAcademico ?? "",
      Gimnasio: usage.gimnasio,
      Piscina: usage.piscina,
      Guardarropas: usage.guardarropas,
      "Tenis de mesa": usage.tenis_mesa,
      Total: total,
      Correo: u.correo ?? "",
      Teléfono: u.telefono ?? "",
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Usuarios por espacio")

  const date = new Date().toISOString().split("T")[0]
  const suffix = fileSuffix ? `_${fileSuffix}` : ""
  XLSX.writeFile(wb, `usuarios_ingresos_por_espacio${suffix}_${date}.xlsx`)
}
