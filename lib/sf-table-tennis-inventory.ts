import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  SfTableTennisPaddle,
  SfTableTennisTable,
  TableTennisLoan,
  TableTennisReport,
  UserProfile,
} from "./types"
import { SF_SEDE, isSanFernandoSede } from "./sede-rules"
import { resolveSede, type Sede } from "./sede"
import { addHoursToHora, nowDateTime } from "./table-tennis-utils"
import {
  getActiveTableTennisLoans,
  loanUsuarioDocumento,
  loanUsuarioNombre,
  userHasLoanToday,
} from "./table-tennis-storage"
const TABLES_COLLECTION = "sfTableTennisTables"
const PADDLES_COLLECTION = "sfTableTennisPaddles"
const LOANS_COLLECTION = "tableTennisLoans"
const REPORTS_COLLECTION = "tableTennisReports"

const MAX_PADDLES_PER_LOAN = 4

function assertSfSede(sede?: Sede) {
  const campus = resolveSede(sede)
  if (!isSanFernandoSede(campus)) {
    throw new Error("Inventario dinámico solo aplica en San Fernando")
  }
  return campus
}

export async function getSfTables(sede: Sede = SF_SEDE): Promise<SfTableTennisTable[]> {
  assertSfSede(sede)
  const q = query(collection(db, TABLES_COLLECTION), where("sede", "==", SF_SEDE))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SfTableTennisTable))
    .filter((t) => t.activo !== false)
    .sort((a, b) => a.numero - b.numero)
}

export async function getSfPaddles(sede: Sede = SF_SEDE): Promise<SfTableTennisPaddle[]> {
  assertSfSede(sede)
  const q = query(collection(db, PADDLES_COLLECTION), where("sede", "==", SF_SEDE))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SfTableTennisPaddle))
    .sort((a, b) => a.mesaNumero - b.mesaNumero || a.serial.localeCompare(b.serial))
}

export async function getSfPaddlesForTable(tableId: string): Promise<SfTableTennisPaddle[]> {
  const all = await getSfPaddles()
  return all.filter((p) => p.tableId === tableId)
}

export async function createSfTable(numero: number): Promise<SfTableTennisTable> {
  const existing = await getSfTables()
  if (existing.some((t) => t.numero === numero)) {
    throw new Error(`Ya existe la mesa ${numero}`)
  }
  const record: Omit<SfTableTennisTable, "id"> = {
    sede: SF_SEDE,
    numero,
    activo: true,
  }
  const ref = await addDoc(collection(db, TABLES_COLLECTION), record)
  return { ...record, id: ref.id }
}

export async function createSfPaddle(tableId: string, serial: string): Promise<SfTableTennisPaddle> {
  const tables = await getSfTables()
  const table = tables.find((t) => t.id === tableId)
  if (!table) throw new Error("Mesa no encontrada")

  const serialNorm = serial.trim()
  if (!serialNorm) throw new Error("Indica el número de serie de la raqueta")

  const paddles = await getSfPaddles()
  if (paddles.some((p) => p.serial.toLowerCase() === serialNorm.toLowerCase())) {
    throw new Error("Ya existe una raqueta con ese número de serie")
  }

  const onTable = paddles.filter((p) => p.tableId === tableId)
  if (onTable.length >= MAX_PADDLES_PER_LOAN) {
    throw new Error(`Máximo ${MAX_PADDLES_PER_LOAN} raquetas por mesa`)
  }

  const record: Omit<SfTableTennisPaddle, "id"> = {
    sede: SF_SEDE,
    tableId,
    mesaNumero: table.numero,
    serial: serialNorm,
    estado: "disponible",
  }
  const ref = await addDoc(collection(db, PADDLES_COLLECTION), record)
  return { ...record, id: ref.id }
}

export async function deactivateSfTable(tableId: string): Promise<void> {
  await updateDoc(doc(db, TABLES_COLLECTION, tableId), { activo: false })
}

export async function deleteSfPaddle(paddleId: string): Promise<void> {
  const paddle = (await getSfPaddles()).find((p) => p.id === paddleId)
  if (!paddle) throw new Error("Raqueta no encontrada")
  if (paddle.estado === "prestada") throw new Error("No se puede eliminar una raqueta prestada")
  await deleteDoc(doc(db, PADDLES_COLLECTION, paddleId))
}

export async function getSfMesaNumbersAvailable(): Promise<number[]> {
  const tables = await getSfTables()
  const activos = await getActiveTableTennisLoans(SF_SEDE)
  const ocupadas = new Set(activos.filter((l) => l.inventoryMode === "dynamic").map((l) => l.mesa))
  return tables.map((t) => t.numero).filter((n) => !ocupadas.has(n))
}

export async function isSfMesaDisponible(mesaNumero: number): Promise<boolean> {
  const activos = await getActiveTableTennisLoans(SF_SEDE)
  return !activos.some((l) => l.inventoryMode === "dynamic" && l.mesa === mesaNumero)
}

export async function createSfTableTennisLoan(params: {
  mesaNumero: number
  paddleIds: string[]
  usuario: UserProfile
  monitorId?: string
  monitorNombre?: string
}): Promise<TableTennisLoan> {
  const { mesaNumero, paddleIds, usuario, monitorId, monitorNombre } = params

  if (paddleIds.length < 1 || paddleIds.length > MAX_PADDLES_PER_LOAN) {
    throw new Error(`Selecciona entre 1 y ${MAX_PADDLES_PER_LOAN} raquetas`)
  }

  if (await userHasLoanToday(usuario.id, SF_SEDE)) {
    throw new Error("Este usuario ya recibió un préstamo hoy. Solo se permite uno por día.")
  }

  if (!(await isSfMesaDisponible(mesaNumero))) {
    throw new Error(`La mesa ${mesaNumero} no está disponible`)
  }

  const paddles = await getSfPaddles()
  const selected = paddleIds.map((id) => paddles.find((p) => p.id === id)).filter(Boolean) as SfTableTennisPaddle[]

  if (selected.length !== paddleIds.length) {
    throw new Error("Una o más raquetas no son válidas")
  }

  if (selected.some((p) => p.mesaNumero !== mesaNumero)) {
    throw new Error("Todas las raquetas deben ser de la misma mesa")
  }

  if (selected.some((p) => p.estado !== "disponible")) {
    throw new Error("Una o más raquetas no están disponibles")
  }

  const { fecha, hora } = nowDateTime()
  const horaFin = addHoursToHora(hora, 1)

  const record: Omit<TableTennisLoan, "id"> = {
    mesa: mesaNumero,
    raqueta1: 0,
    raqueta2: 0,
    usuarioId: usuario.id,
    usuarioNombre: usuario.nombres,
    usuarioDocumento: usuario.numeroDocumento,
    sede: SF_SEDE,
    fecha,
    horaInicio: hora,
    horaFin,
    estado: "activo",
    inventoryMode: "dynamic",
    paddleIds: selected.map((p) => p.id),
    paddleSerials: selected.map((p) => p.serial),
    returnedPaddleIds: [],
    monitorId,
    monitorNombre,
  }

  const ref = await addDoc(collection(db, LOANS_COLLECTION), record)

  for (const p of selected) {
    await updateDoc(doc(db, PADDLES_COLLECTION, p.id), { estado: "prestada" })
  }

  return { ...record, id: ref.id }
}

export async function returnSfPaddle(params: {
  loan: TableTennisLoan
  paddleId: string
  reportDamage?: boolean
  damageDescription?: string
  generadoPor?: string
}): Promise<void> {
  const { loan, paddleId, reportDamage, damageDescription, generadoPor } = params

  if (loan.inventoryMode !== "dynamic" || !loan.paddleIds?.includes(paddleId)) {
    throw new Error("Raqueta no pertenece a este préstamo")
  }

  const returned = new Set(loan.returnedPaddleIds ?? [])
  if (returned.has(paddleId)) {
    throw new Error("Esta raqueta ya fue devuelta")
  }

  const paddles = await getSfPaddles()
  const paddle = paddles.find((p) => p.id === paddleId)
  if (!paddle) throw new Error("Raqueta no encontrada")

  if (reportDamage) {
    const { fecha: fechaReporte, hora: horaReporte } = nowDateTime()
    const report: Omit<TableTennisReport, "id"> = {
      loanId: loan.id,
      sede: SF_SEDE,
      mesa: loan.mesa,
      raqueta1: 0,
      raqueta2: 0,
      usuarioNombre: loanUsuarioNombre(loan),
      usuarioDocumento: loanUsuarioDocumento(loan),
      fecha: loan.fecha,
      horaInicio: loan.horaInicio,
      horaFin: loan.horaFin,
      fechaReporte,
      horaReporte,
      generadoPor,
      paddleId,
      paddleSerial: paddle.serial,
      damageDescription: damageDescription?.trim() || "Daño reportado",
    }
    await addDoc(collection(db, REPORTS_COLLECTION), report)
    await updateDoc(doc(db, PADDLES_COLLECTION, paddleId), { estado: "danada" })
  } else {
    await updateDoc(doc(db, PADDLES_COLLECTION, paddleId), { estado: "disponible" })
  }

  returned.add(paddleId)
  const allReturned = loan.paddleIds.every((id) => returned.has(id))

  await updateDoc(doc(db, LOANS_COLLECTION, loan.id), {
    returnedPaddleIds: Array.from(returned),
    ...(allReturned
      ? { estado: "devuelto", devueltoAt: new Date().toISOString() }
      : {}),
  })
}
