import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  Timestamp
} from "firebase/firestore"
import { db } from "./firebase"
import type { UserProfile, BiometricData, EntryRecord, AttendanceStats, LockerRecord, AttendanceRecord } from "./types"

const USERS_COLLECTION = "users"
const LOCKERS_COLLECTION = "lockers"
const ENTRIES_COLLECTION = "entries"
const BIOMETRIC_COLLECTION = "biometric"

/** Texto legacy guardado como marcador; no debe contarse en estadísticas ni mostrarse como programa real */
function normalizeAcademicField(value: unknown): string {
  if (value == null) return ""
  const s = String(value).trim()
  if (s === "" || /^n\/a$/i.test(s)) return ""
  return s
}

function normalizeUserDoc(id: string, data: Record<string, unknown>): UserProfile {
  return {
    ...(data as Omit<UserProfile, "id">),
    id,
    facultad: normalizeAcademicField(data.facultad),
    programaAcademico: normalizeAcademicField(data.programaAcademico),
  }
}

// === USUARIOS ===
export async function getUsers(): Promise<UserProfile[]> {
  const querySnapshot = await getDocs(collection(db, USERS_COLLECTION))
  return querySnapshot.docs.map((d) => normalizeUserDoc(d.id, d.data() as Record<string, unknown>))
}

export async function getSystemUsers() {
  const { getSystemUsers: _get } = await import("./auth")
  return _get()
}

export async function saveUser(user: Omit<UserProfile, "id" | "fechaRegistro" | "activo">): Promise<UserProfile> {
  const newUser = {
    ...user,
    facultad: normalizeAcademicField(user.facultad),
    programaAcademico: normalizeAcademicField(user.programaAcademico),
    fechaRegistro: new Date().toISOString(),
    activo: true,
  }
  const docRef = await addDoc(collection(db, USERS_COLLECTION), newUser)
  return normalizeUserDoc(docRef.id, newUser as Record<string, unknown>)
}

// Función para buscar usuario por nombre, cédula o código estudiantil
export async function searchUserByCode(searchTerm: string): Promise<UserProfile | undefined> {
  try {
    // Validar que el término no esté vacío
    if (!searchTerm || searchTerm.trim() === "") {
      return undefined
    }

    const term = searchTerm.trim()
    const termLower = term.toLowerCase()

    // Obtener todos los usuarios de la base de datos
    const allUsers = await getUsers()

    // Buscar el usuario que coincida con el término de búsqueda
    const foundUser = allUsers.find(user => {
      // Buscar por número de documento (cédula) - coincidencia exacta o parcial
      if (user.numeroDocumento) {
        const docNorm = user.numeroDocumento.trim().toLowerCase()
        if (docNorm === termLower || docNorm.includes(termLower)) return true
      }

      // Buscar por código estudiantil - coincidencia exacta o parcial
      if (user.codigoEstudiantil) {
        const codNorm = user.codigoEstudiantil.trim().toLowerCase()
        if (codNorm === termLower || codNorm.includes(termLower)) return true
      }

      // Buscar por nombre - coincidencia parcial
      if (user.nombres && user.nombres.toLowerCase().includes(termLower)) {
        return true
      }

      return false
    })

    return foundUser
  } catch (error) {
    console.error("Error en searchUserByCode:", error)
    return undefined
  }
}

export async function getUserByDocument(numeroDocumento: string): Promise<UserProfile | undefined> {
  const allUsers = await getUsers()
  return allUsers.find(u => u.numeroDocumento?.trim().toLowerCase() === numeroDocumento.trim().toLowerCase())
}
export async function searchUser(searchTerm: string): Promise<UserProfile | undefined> {
  return searchUserByCode(searchTerm)
}

export async function getUserById(id: string): Promise<UserProfile | undefined> {
  const docRef = doc(db, USERS_COLLECTION, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return undefined
  return normalizeUserDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
}

export async function updateUser(id: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
  const docRef = doc(db, USERS_COLLECTION, id)
  const payload: Partial<UserProfile> = { ...data }
  if (data.facultad !== undefined) payload.facultad = normalizeAcademicField(data.facultad)
  if (data.programaAcademico !== undefined) {
    payload.programaAcademico = normalizeAcademicField(data.programaAcademico)
  }
  await updateDoc(docRef, payload)
  const updated = await getDoc(docRef)
  if (!updated.exists()) return null
  return normalizeUserDoc(updated.id, updated.data() as Record<string, unknown>)
}

export async function deleteUser(id: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, id)
  await deleteDoc(docRef)
}

export async function removeUser(id: string): Promise<void> {
  return deleteUser(id)
}

// === ENTRADAS ===
export async function getEntries(): Promise<EntryRecord[]> {
  const querySnapshot = await getDocs(collection(db, ENTRIES_COLLECTION))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EntryRecord[]
}

export async function saveEntry(usuarioId: string, instalacion: "gimnasio" | "piscina" = "gimnasio"): Promise<EntryRecord> {
  const now = new Date()
  const newEntry = {
    usuarioId,
    instalacion,
    fecha: now.toISOString().split("T")[0],
    hora: now.toTimeString().split(" ")[0],
  }
  const docRef = await addDoc(collection(db, ENTRIES_COLLECTION), newEntry)
  return {
    ...newEntry,
    id: docRef.id,
  } as EntryRecord
}

export async function getEntriesByUser(usuarioId: string): Promise<EntryRecord[]> {
  const q = query(collection(db, ENTRIES_COLLECTION), where("usuarioId", "==", usuarioId))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EntryRecord[]
}

// === DATOS BIOMETRICOS ===
export async function getBiometricData(): Promise<BiometricData[]> {
  const querySnapshot = await getDocs(collection(db, BIOMETRIC_COLLECTION))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BiometricData[]
}

export async function saveBiometricData(data: Omit<BiometricData, "id" | "fecha">): Promise<BiometricData> {
  const newRecord = {
    ...data,
    fecha: new Date().toISOString(),
  }
  const docRef = await addDoc(collection(db, BIOMETRIC_COLLECTION), newRecord)
  return {
    ...newRecord,
    id: docRef.id,
  } as BiometricData
}

export async function updateBiometricData(id: string, data: Partial<Omit<BiometricData, "id">>): Promise<void> {
  const docRef = doc(db, BIOMETRIC_COLLECTION, id)
  await updateDoc(docRef, data)
}

export async function getBiometricByUser(usuarioId: string): Promise<BiometricData[]> {
  const q = query(collection(db, BIOMETRIC_COLLECTION), where("usuarioId", "==", usuarioId))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }) as BiometricData)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

// === ESTADISTICAS ===
export async function generateStats(
  instalacion?: "gimnasio" | "piscina",
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<AttendanceStats> {
  const users = await getUsers()
  const allEntries = await getEntries()
  const usageCounts = await getUserServiceUsageCounts()

  const totalGimnasio = allEntries.filter(e => (e.instalacion ?? "gimnasio") === "gimnasio").length
  const totalPiscina = allEntries.filter(e => e.instalacion === "piscina").length

  // Usuarios únicos por servicio: reutiliza getUserServiceUsageCounts igual que la página de usuarios
  const usuariosUnicosGimnasio = Object.values(usageCounts).filter(u => u.gimnasio > 0).length
  const usuariosUnicosPiscina  = Object.values(usageCounts).filter(u => u.piscina > 0).length

  // Filtrar entradas por instalacion si se especifica
  let entries = instalacion
    ? allEntries.filter(e => (e.instalacion ?? "gimnasio") === instalacion)
    : allEntries

  // Filtrar por rango de fechas si se especifica
  if (fechaDesde) entries = entries.filter(e => e.fecha >= fechaDesde!)
  if (fechaHasta) entries = entries.filter(e => e.fecha <= fechaHasta!)

  // Usuarios únicos del espacio filtrado
  let usuariosUnicos: number | undefined
  if (instalacion === "gimnasio") usuariosUnicos = usuariosUnicosGimnasio
  else if (instalacion === "piscina") usuariosUnicos = usuariosUnicosPiscina

  const porGenero: Record<string, number> = {}
  const porEstamento: Record<string, number> = {}
  const porFacultad: Record<string, number> = {}
  const porPrograma: Record<string, number> = {}
  const entradasPorDiaMap: Record<string, number> = {}
  const entradasPorHoraMap: Record<string, number> = {}

  users.forEach((user) => {
    porGenero[user.genero] = (porGenero[user.genero] || 0) + 1
    porEstamento[user.estamento] = (porEstamento[user.estamento] || 0) + 1
    const fac = normalizeAcademicField(user.facultad)
    const prog = normalizeAcademicField(user.programaAcademico)
    if (fac) {
      porFacultad[fac] = (porFacultad[fac] || 0) + 1
    }
    if (prog) {
      porPrograma[prog] = (porPrograma[prog] || 0) + 1
    }
  })

  entries.forEach((entry) => {
    entradasPorDiaMap[entry.fecha] = (entradasPorDiaMap[entry.fecha] || 0) + 1
    const hora = entry.hora.split(":")[0] + ":00"
    entradasPorHoraMap[hora] = (entradasPorHoraMap[hora] || 0) + 1
  })

  const entradasPorDia = Object.entries(entradasPorDiaMap)
    .map(([fecha, cantidad]) => ({ fecha, cantidad }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(-30)

  const entradasPorHora = Object.entries(entradasPorHoraMap)
    .map(([hora, cantidad]) => ({ hora, cantidad }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  return {
    totalUsuarios: users.length,
    totalEntradas: entries.length,
    totalGimnasio,
    totalPiscina,
    usuariosUnicos,
    usuariosUnicosGimnasio,
    usuariosUnicosPiscina,
    porGenero,
    porEstamento,
    porFacultad,
    porPrograma,
    entradasPorDia,
    entradasPorHora,
  }
}

// Funcion para filtrar usuarios
export async function filterUsers(filters: {
  nombre?: string
  programa?: string
  estamento?: string
  facultad?: string
}): Promise<UserProfile[]> {
  let users = await getUsers()

  if (filters.nombre) {
    const term = filters.nombre.toLowerCase()
    users = users.filter((u) => u.nombres.toLowerCase().includes(term))
  }
  if (filters.programa && filters.programa !== "TODOS") {
    users = users.filter((u) => u.programaAcademico === filters.programa)
  }
  if (filters.estamento && filters.estamento !== "TODOS") {
    users = users.filter((u) => u.estamento === filters.estamento)
  }
  if (filters.facultad && filters.facultad !== "TODOS") {
    users = users.filter((u) => u.facultad === filters.facultad)
  }

  return users
}

// === GUARDARROPAS ===
function generateToken(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const l1 = letters[Math.floor(Math.random() * letters.length)]
  const l2 = letters[Math.floor(Math.random() * letters.length)]
  const n1 = Math.floor(Math.random() * 10)
  const n2 = Math.floor(Math.random() * 10)
  const n3 = Math.floor(Math.random() * 10)
  return `${l1}${l2}${n1}${n2}${n3}`
}

export async function getActiveLockers(): Promise<LockerRecord[]> {
  const q = query(collection(db, LOCKERS_COLLECTION), where("estado", "==", "ocupado"))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LockerRecord[]
}

export async function createLockerRecord(casillero: string, usuarioId: string): Promise<LockerRecord> {
  const now = new Date()
  // Asegurar token único
  const activeLockers = await getActiveLockers()
  const usedTokens = new Set(activeLockers.map(l => l.token))
  let token = generateToken()
  let attempts = 0
  while (usedTokens.has(token) && attempts < 20) {
    token = generateToken()
    attempts++
  }

  const record: Omit<LockerRecord, "id"> = {
    casillero,
    token,
    usuarioId,
    fechaIngreso: now.toISOString().split("T")[0],
    horaIngreso: now.toTimeString().split(" ")[0],
    estado: "ocupado",
  }
  const docRef = await addDoc(collection(db, LOCKERS_COLLECTION), record)
  return { ...record, id: docRef.id }
}

export async function releaseLocker(id: string, motivo?: string): Promise<void> {
  const docRef = doc(db, LOCKERS_COLLECTION, id)
  await updateDoc(docRef, {
    estado: "libre",
    motivoLiberacion: motivo ?? "liberado manualmente",
    fechaLiberacion: new Date().toISOString(),
  })
}

export async function validateLockerToken(casillero: string, token: string): Promise<LockerRecord | null> {
  const activeLockers = await getActiveLockers()
  const match = activeLockers.find(
    l => l.casillero === casillero && l.token.toUpperCase() === token.toUpperCase()
  )
  return match ?? null
}

export async function getAllLockers(): Promise<LockerRecord[]> {
  const snap = await getDocs(collection(db, LOCKERS_COLLECTION))
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as LockerRecord[]
}

export type UserServiceUsage = { gimnasio: number; piscina: number; guardarropas: number }

/** Conteos por usuario: entradas gimnasio/piscina y registros de casillero (guardarropas). */
export async function getUserServiceUsageCounts(): Promise<Record<string, UserServiceUsage>> {
  const [entries, lockers] = await Promise.all([getEntries(), getAllLockers()])
  const counts: Record<string, UserServiceUsage> = {}

  const bump = (userId: string, key: keyof UserServiceUsage) => {
    if (!userId) return
    if (!counts[userId]) counts[userId] = { gimnasio: 0, piscina: 0, guardarropas: 0 }
    counts[userId][key]++
  }

  for (const e of entries) {
    const inst = e.instalacion ?? "gimnasio"
    if (inst === "piscina") bump(e.usuarioId, "piscina")
    else bump(e.usuarioId, "gimnasio")
  }

  for (const l of lockers) {
    bump(l.usuarioId, "guardarropas")
  }

  return counts
}

// === ASISTENCIA MONITORES ===
const ATTENDANCE_COLLECTION = "monitorAttendance"

export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const snap = await getDocs(collection(db, ATTENDANCE_COLLECTION))
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as AttendanceRecord[]
}

export async function getTodayAttendance(monitorId: string): Promise<AttendanceRecord | null> {
  const today = new Date().toISOString().split("T")[0]
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("monitorId", "==", monitorId),
    where("fecha", "==", today)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as AttendanceRecord
}

export async function registerAttendanceEntry(monitorId: string, monitorNombre: string, espacio: string): Promise<AttendanceRecord> {
  const now = new Date()
  const record = {
    monitorId,
    monitorNombre,
    espacio,
    fecha: now.toISOString().split("T")[0],
    horaEntrada: now.toTimeString().slice(0, 5),
  }
  const ref = await addDoc(collection(db, ATTENDANCE_COLLECTION), record)
  return { ...record, id: ref.id }
}

export async function registerAttendanceExit(id: string): Promise<void> {
  const docRef = doc(db, ATTENDANCE_COLLECTION, id)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return
  const data = snap.data() as AttendanceRecord
  const now = new Date()
  const horaSalida = now.toTimeString().slice(0, 5)
  // calcular duración
  const [eh, em] = data.horaEntrada.split(":").map(Number)
  const [sh, sm] = horaSalida.split(":").map(Number)
  const duracionMinutos = (sh * 60 + sm) - (eh * 60 + em)
  await updateDoc(docRef, { horaSalida, duracionMinutos: Math.max(0, duracionMinutos) })
}
