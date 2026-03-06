import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  Timestamp
} from "firebase/firestore"
import { db } from "./firebase"
import type { UserProfile, BiometricData, EntryRecord, AttendanceStats } from "./types"

const USERS_COLLECTION = "users"
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

export async function getUserByDocument(numeroDocumento: string): Promise<UserProfile | undefined> {
  const q = query(collection(db, USERS_COLLECTION), where("numeroDocumento", "==", numeroDocumento))
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) return undefined
  const doc = querySnapshot.docs[0]
  return { id: doc.id, ...doc.data() } as UserProfile
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

// === ENTRADAS ===
export async function getEntries(): Promise<EntryRecord[]> {
  const querySnapshot = await getDocs(collection(db, ENTRIES_COLLECTION))
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EntryRecord[]
}

export async function saveEntry(usuarioId: string): Promise<EntryRecord> {
  const now = new Date()
  const newEntry = {
    usuarioId,
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
export async function generateStats(): Promise<AttendanceStats> {
  const users = await getUsers()
  const entries = await getEntries()

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
