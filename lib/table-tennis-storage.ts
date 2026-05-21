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
import type { AttendanceStats, TableTennisLoan, TableTennisReport, UserProfile } from "./types"
import {
  addHoursToHora,
  nowDateTime,
  prestamoVencido,
  raquetasForMesa,
} from "./table-tennis-utils"
import { getUsers } from "./storage"

const LOANS_COLLECTION = "tableTennisLoans"
const REPORTS_COLLECTION = "tableTennisReports"

function mapLoan(id: string, data: Record<string, unknown>): TableTennisLoan {
  return { id, ...data } as TableTennisLoan
}

export async function getActiveTableTennisLoans(): Promise<TableTennisLoan[]> {
  const q = query(collection(db, LOANS_COLLECTION), where("estado", "==", "activo"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapLoan(d.id, d.data() as Record<string, unknown>))
}

export async function getVencidosSinReporte(): Promise<TableTennisLoan[]> {
  const activos = await getActiveTableTennisLoans()
  return activos.filter((l) => prestamoVencido(l.fecha, l.horaFin))
}

export async function getAllTableTennisLoans(): Promise<TableTennisLoan[]> {
  const snap = await getDocs(collection(db, LOANS_COLLECTION))
  return snap.docs.map((d) => mapLoan(d.id, d.data() as Record<string, unknown>))
}

export async function getTableTennisReports(): Promise<TableTennisReport[]> {
  const q = query(collection(db, REPORTS_COLLECTION), orderBy("fechaReporte", "desc"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TableTennisReport))
}

export async function isMesaDisponible(mesa: number): Promise<boolean> {
  const activos = await getActiveTableTennisLoans()
  return !activos.some((l) => l.mesa === mesa)
}

export async function createTableTennisLoan(params: {
  mesa: number
  usuario1: UserProfile
  usuario2: UserProfile
  monitorId?: string
  monitorNombre?: string
}): Promise<TableTennisLoan> {
  const { mesa, usuario1, usuario2, monitorId, monitorNombre } = params
  if (mesa < 1 || mesa > 8) throw new Error("Mesa inválida")
  if (usuario1.id === usuario2.id) throw new Error("Deben ser dos personas distintas")

  const disponible = await isMesaDisponible(mesa)
  if (!disponible) throw new Error(`La mesa ${mesa} no está disponible`)

  const [raqueta1, raqueta2] = raquetasForMesa(mesa)
  const { fecha, hora } = nowDateTime()
  const horaFin = addHoursToHora(hora, 1)

  const record: Omit<TableTennisLoan, "id"> = {
    mesa,
    raqueta1,
    raqueta2,
    usuario1Id: usuario1.id,
    usuario2Id: usuario2.id,
    usuario1Nombre: usuario1.nombres,
    usuario2Nombre: usuario2.nombres,
    usuario1Documento: usuario1.numeroDocumento,
    usuario2Documento: usuario2.numeroDocumento,
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
    usuario1Nombre: loan.usuario1Nombre,
    usuario2Nombre: loan.usuario2Nombre,
    usuario1Documento: loan.usuario1Documento,
    usuario2Documento: loan.usuario2Documento,
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
  const allLoans = await getAllTableTennisLoans()
  const reports = await getTableTennisReports()

  let loans = allLoans
  if (fechaDesde) loans = loans.filter((l) => l.fecha >= fechaDesde)
  if (fechaHasta) loans = loans.filter((l) => l.fecha <= fechaHasta)

  const userIds = new Set<string>()
  loans.forEach((l) => {
    userIds.add(l.usuario1Id)
    userIds.add(l.usuario2Id)
  })

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

  loans.forEach((loan) => {
    entradasPorDiaMap[loan.fecha] = (entradasPorDiaMap[loan.fecha] || 0) + 1
    const hora = loan.horaInicio.split(":")[0] + ":00"
    entradasPorHoraMap[hora] = (entradasPorHoraMap[hora] || 0) + 1
  })

  const activos = loans.filter((l) => l.estado === "activo").length

  return {
    totalUsuarios: users.length,
    totalEntradas: loans.length,
    totalGimnasio: 0,
    totalPiscina: 0,
    totalTenisMesa: loans.length,
    reportesTenisMesa: reports.length,
    prestamosActivosTenis: activos,
    usuariosUnicos: userIds.size,
    usuariosUnicosTenisMesa: userIds.size,
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
