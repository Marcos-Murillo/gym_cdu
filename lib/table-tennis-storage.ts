import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  AttendanceStats,
  TableTennisAccess,
  TableTennisHistoryEntry,
  TableTennisLoan,
  TableTennisReport,
  UserProfile,
} from "./types"
import {
  addHoursToHora,
  nowDateTime,
  prestamoVencido,
  raquetasForMesa,
} from "./table-tennis-utils"
import { getUsers } from "./storage"

const LOANS_COLLECTION = "tableTennisLoans"
const REPORTS_COLLECTION = "tableTennisReports"
const ACCESS_COLLECTION = "tableTennisAccess"

function normalizeLoan(id: string, data: Record<string, unknown>): TableTennisLoan {
  const raw = { id, ...data } as TableTennisLoan
  if (raw.usuarioId) return raw
  return {
    ...raw,
    usuarioId: raw.usuario1Id ?? "",
    usuarioNombre: raw.usuario1Nombre ?? "",
    usuarioDocumento: raw.usuario1Documento ?? "",
  }
}

export function loanUsuarioId(loan: TableTennisLoan): string {
  return loan.usuarioId || loan.usuario1Id || ""
}

export function loanUsuarioNombre(loan: TableTennisLoan): string {
  return loan.usuarioNombre || loan.usuario1Nombre || ""
}

export function loanUsuarioDocumento(loan: TableTennisLoan): string {
  return loan.usuarioDocumento || loan.usuario1Documento || ""
}

export async function getActiveTableTennisLoans(): Promise<TableTennisLoan[]> {
  const q = query(collection(db, LOANS_COLLECTION), where("estado", "==", "activo"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => normalizeLoan(d.id, d.data() as Record<string, unknown>))
}

export async function getAllTableTennisLoans(): Promise<TableTennisLoan[]> {
  const snap = await getDocs(collection(db, LOANS_COLLECTION))
  return snap.docs
    .map((d) => normalizeLoan(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => `${b.fecha} ${b.horaInicio}`.localeCompare(`${a.fecha} ${a.horaInicio}`))
}

export async function getAllTableTennisAccess(): Promise<TableTennisAccess[]> {
  const snap = await getDocs(collection(db, ACCESS_COLLECTION))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as TableTennisAccess))
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`))
}

export async function getTableTennisReports(): Promise<TableTennisReport[]> {
  const q = query(collection(db, REPORTS_COLLECTION), orderBy("fechaReporte", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TableTennisReport))
}

export async function getTableTennisHistory(): Promise<TableTennisHistoryEntry[]> {
  const [accesos, prestamos] = await Promise.all([
    getAllTableTennisAccess(),
    getAllTableTennisLoans(),
  ])
  const entries: TableTennisHistoryEntry[] = [
    ...accesos.map((a) => ({ tipo: "acceso" as const, ...a })),
    ...prestamos.map((p) => ({ tipo: "prestamo" as const, ...p })),
  ]
  return entries.sort((a, b) => {
    const ta = a.tipo === "acceso" ? `${a.fecha} ${a.hora}` : `${a.fecha} ${a.horaInicio}`
    const tb = b.tipo === "acceso" ? `${b.fecha} ${b.hora}` : `${b.fecha} ${b.horaInicio}`
    return tb.localeCompare(ta)
  })
}

export async function isMesaDisponible(mesa: number): Promise<boolean> {
  const activos = await getActiveTableTennisLoans()
  return !activos.some((l) => l.mesa === mesa)
}

export async function userHasLoanToday(usuarioId: string, fecha?: string): Promise<boolean> {
  const hoy = fecha ?? nowDateTime().fecha
  const all = await getAllTableTennisLoans()
  return all.some((l) => loanUsuarioId(l) === usuarioId && l.fecha === hoy)
}

export async function createTableTennisAccess(
  usuario: UserProfile,
  mesa: number,
): Promise<TableTennisAccess> {
  if (mesa < 1 || mesa > 8) throw new Error("Mesa inválida (1 a 8)")
  const { fecha, hora } = nowDateTime()
  const record: Omit<TableTennisAccess, "id"> = {
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombres,
    usuarioDocumento: usuario.numeroDocumento,
    mesa,
    fecha,
    hora,
  }
  const ref = await addDoc(collection(db, ACCESS_COLLECTION), record)
  return { ...record, id: ref.id }
}

export async function createTableTennisLoan(params: {
  mesa: number
  usuario: UserProfile
  monitorId?: string
  monitorNombre?: string
}): Promise<TableTennisLoan> {
  const { mesa, usuario, monitorId, monitorNombre } = params
  if (mesa < 1 || mesa > 8) throw new Error("Mesa inválida")

  if (await userHasLoanToday(usuario.id)) {
    throw new Error("Este usuario ya recibió un préstamo hoy. Solo se permite uno por día.")
  }

  const disponible = await isMesaDisponible(mesa)
  if (!disponible) throw new Error(`La mesa ${mesa} no está disponible`)

  const [raqueta1, raqueta2] = raquetasForMesa(mesa)
  const { fecha, hora } = nowDateTime()
  const horaFin = addHoursToHora(hora, 1)

  const record: Omit<TableTennisLoan, "id"> = {
    mesa,
    raqueta1,
    raqueta2,
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombres,
    usuarioDocumento: usuario.numeroDocumento,
    fecha,
    horaInicio: hora,
    horaFin,
    estado: "activo",
    monitorId,
    monitorNombre,
  }

  const ref = await addDoc(collection(db, LOANS_COLLECTION), record)
  return { ...record, id: ref.id }
}

export async function returnTableTennisPaddles(loanId: string): Promise<void> {
  const docRef = doc(db, LOANS_COLLECTION, loanId)
  await updateDoc(docRef, {
    estado: "devuelto",
    devueltoAt: new Date().toISOString(),
  })
}

export async function markLoanVencido(loanId: string): Promise<void> {
  const docRef = doc(db, LOANS_COLLECTION, loanId)
  await updateDoc(docRef, { estado: "vencido" })
}

export async function createTableTennisReport(
  loan: TableTennisLoan,
  generadoPor?: string,
): Promise<TableTennisReport> {
  const { fecha: fechaReporte, hora: horaReporte } = nowDateTime()
  const report: Omit<TableTennisReport, "id"> = {
    loanId: loan.id,
    mesa: loan.mesa,
    raqueta1: loan.raqueta1,
    raqueta2: loan.raqueta2,
    usuarioNombre: loanUsuarioNombre(loan),
    usuarioDocumento: loanUsuarioDocumento(loan),
    fecha: loan.fecha,
    horaInicio: loan.horaInicio,
    horaFin: loan.horaFin,
    fechaReporte,
    horaReporte,
    generadoPor,
  }
  const ref = await addDoc(collection(db, REPORTS_COLLECTION), report)
  await markLoanVencido(loan.id)
  return { ...report, id: ref.id }
}

export async function generateTableTennisStats(
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<AttendanceStats> {
  const users = await getUsers()
  const [allLoans, allAccess, reports] = await Promise.all([
    getAllTableTennisLoans(),
    getAllTableTennisAccess(),
    getTableTennisReports(),
  ])

  let loans = allLoans
  let accesos = allAccess
  if (fechaDesde) {
    loans = loans.filter((l) => l.fecha >= fechaDesde)
    accesos = accesos.filter((a) => a.fecha >= fechaDesde)
  }
  if (fechaHasta) {
    loans = loans.filter((l) => l.fecha <= fechaHasta)
    accesos = accesos.filter((a) => a.fecha <= fechaHasta)
  }

  const userIds = new Set<string>()
  loans.forEach((l) => userIds.add(loanUsuarioId(l)))
  accesos.forEach((a) => userIds.add(a.usuarioId))

  const porGenero: Record<string, number> = {}
  const porEstamento: Record<string, number> = {}
  const porFacultad: Record<string, number> = {}
  const porPrograma: Record<string, number> = {}
  const entradasPorDiaMap: Record<string, number> = {}
  const entradasPorHoraMap: Record<string, number> = {}

  users
    .filter((u) => userIds.has(u.id))
    .forEach((user) => {
      porGenero[user.genero] = (porGenero[user.genero] || 0) + 1
      porEstamento[user.estamento] = (porEstamento[user.estamento] || 0) + 1
      if (user.facultad) porFacultad[user.facultad] = (porFacultad[user.facultad] || 0) + 1
      if (user.programaAcademico) {
        porPrograma[user.programaAcademico] = (porPrograma[user.programaAcademico] || 0) + 1
      }
    })

  accesos.forEach((a) => {
    entradasPorDiaMap[a.fecha] = (entradasPorDiaMap[a.fecha] || 0) + 1
    const hora = a.hora.split(":")[0] + ":00"
    entradasPorHoraMap[hora] = (entradasPorHoraMap[hora] || 0) + 1
  })

  loans.forEach((loan) => {
    entradasPorDiaMap[loan.fecha] = (entradasPorDiaMap[loan.fecha] || 0) + 1
    const hora = loan.horaInicio.split(":")[0] + ":00"
    entradasPorHoraMap[hora] = (entradasPorHoraMap[hora] || 0) + 1
  })

  const activos = loans.filter((l) => l.estado === "activo").length
  const totalActividad = accesos.length + loans.length

  const mesaCounts: Record<number, number> = {}
  accesos.forEach((a) => {
    mesaCounts[a.mesa] = (mesaCounts[a.mesa] || 0) + 1
  })
  loans.forEach((l) => {
    mesaCounts[l.mesa] = (mesaCounts[l.mesa] || 0) + 1
  })
  let mesaMasUsada: number | undefined
  let usosMesaMasUsada = 0
  for (const [mesaStr, count] of Object.entries(mesaCounts)) {
    const mesaNum = Number(mesaStr)
    if (count > usosMesaMasUsada || (count === usosMesaMasUsada && mesaNum < (mesaMasUsada ?? 99))) {
      usosMesaMasUsada = count
      mesaMasUsada = mesaNum
    }
  }

  return {
    totalUsuarios: users.length,
    totalEntradas: totalActividad,
    totalGimnasio: 0,
    totalPiscina: 0,
    totalTenisMesa: totalActividad,
    reportesTenisMesa: reports.length,
    prestamosActivosTenis: activos,
    usuariosUnicos: userIds.size,
    usuariosUnicosTenisMesa: userIds.size,
    mesaMasUsada,
    usosMesaMasUsada: mesaMasUsada ? usosMesaMasUsada : undefined,
    porGenero,
    porEstamento,
    porFacultad,
    porPrograma,
    entradasPorDia: Object.entries(entradasPorDiaMap)
      .map(([fecha, cantidad]) => ({ fecha, cantidad }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-30),
    entradasPorHora: Object.entries(entradasPorHoraMap)
      .map(([hora, cantidad]) => ({ hora, cantidad }))
      .sort((a, b) => a.hora.localeCompare(b.hora)),
  }
}
