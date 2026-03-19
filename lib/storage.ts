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
import type { UserProfile, BiometricData, EntryRecord, AttendanceStats, LockerRecord } from "./types"

const USERS_COLLECTION = "users"
const LOCKERS_COLLECTION = "lockers"
const ENTRIES_COLLECTION = "entries"
const BIOMETRIC_COLLECTION = "biometric"

// === USUARIOS ===
export async function getUsers(): Promise<UserProfile[]> {
  const querySnapshot = await getDocs(collection(db, USERS_COLLECTION))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as UserProfile[]
}

export async function saveUser(user: Omit<UserProfile, "id" | "fechaRegistro" | "activo">): Promise<UserProfile> {
  const newUser = {
    ...user,
    fechaRegistro: new Date().toISOString(),
    activo: true,
  }
  const docRef = await addDoc(collection(db, USERS_COLLECTION), newUser)
  return {
    ...newUser,
    id: docRef.id,
  } as UserProfile
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
  return { id: docSnap.id, ...docSnap.data() } as UserProfile
}

export async function updateUser(id: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
  const docRef = doc(db, USERS_COLLECTION, id)
  await updateDoc(docRef, data)
  const updated = await getDoc(docRef)
  if (!updated.exists()) return null
  return { id: updated.id, ...updated.data() } as UserProfile
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
export async function generateStats(instalacion?: "gimnasio" | "piscina"): Promise<AttendanceStats> {
  const users = await getUsers()
  const allEntries = await getEntries()

  const totalGimnasio = allEntries.filter(e => (e.instalacion ?? "gimnasio") === "gimnasio").length
  const totalPiscina = allEntries.filter(e => e.instalacion === "piscina").length

  // Filtrar entradas por instalacion si se especifica
  const entries = instalacion
    ? allEntries.filter(e => (e.instalacion ?? "gimnasio") === instalacion)
    : allEntries

  const porGenero: Record<string, number> = {}
  const porEstamento: Record<string, number> = {}
  const porFacultad: Record<string, number> = {}
  const porPrograma: Record<string, number> = {}
  const entradasPorDiaMap: Record<string, number> = {}
  const entradasPorHoraMap: Record<string, number> = {}

  users.forEach((user) => {
    porGenero[user.genero] = (porGenero[user.genero] || 0) + 1
    porEstamento[user.estamento] = (porEstamento[user.estamento] || 0) + 1
    if (user.facultad) {
      porFacultad[user.facultad] = (porFacultad[user.facultad] || 0) + 1
    }
    if (user.programaAcademico) {
      porPrograma[user.programaAcademico] = (porPrograma[user.programaAcademico] || 0) + 1
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

export async function releaseLocker(id: string): Promise<void> {
  const docRef = doc(db, LOCKERS_COLLECTION, id)
  await updateDoc(docRef, { estado: "libre" })
}

export async function validateLockerToken(casillero: string, token: string): Promise<LockerRecord | null> {
  const activeLockers = await getActiveLockers()
  const match = activeLockers.find(
    l => l.casillero === casillero && l.token.toUpperCase() === token.toUpperCase()
  )
  return match ?? null
}
