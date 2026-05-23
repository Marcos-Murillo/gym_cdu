import { collection, doc, getDocs, addDoc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"
import type { SystemUser, UserRole, Espacio } from "./types"
import { getSedeForNewStaff, resolveSede, type Sede } from "./sede"

const SYSTEM_USERS_COLLECTION = "systemUsers"

// Simple hash para contraseñas (en producción usar bcrypt o similar)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function normalizeSystemUser(id: string, data: Record<string, unknown>): SystemUser {
  const raw = { id, ...data } as SystemUser
  return { ...raw, sede: resolveSede(raw.sede as string | undefined) }
}

export async function getSystemUsers(): Promise<SystemUser[]> {
  const snap = await getDocs(collection(db, SYSTEM_USERS_COLLECTION))
  return snap.docs.map((d) => normalizeSystemUser(d.id, d.data() as Record<string, unknown>))
}

export async function getSystemUserByCedula(cedula: string): Promise<SystemUser | null> {
  const users = await getSystemUsers()
  return users.find((u) => u.cedula === cedula) ?? null
}

export async function createSystemUser(data: {
  nombre: string
  cedula: string
  password: string
  rol: UserRole
  espacio?: Espacio
  sede?: Sede
  creadoPor: string
  creator?: SystemUser
}): Promise<SystemUser> {
  const creator = data.creator ?? (await getSystemUsers()).find((u) => u.id === data.creadoPor)
  const sede =
    creator && data.rol !== "superadmin"
      ? getSedeForNewStaff(creator, data.sede)
      : data.sede
        ? resolveSede(data.sede)
        : resolveSede(undefined)

  const newUser = {
    nombre: data.nombre,
    cedula: data.cedula,
    passwordHash: simpleHash(data.password),
    rol: data.rol,
    espacio: data.espacio ?? null,
    sede: data.rol === "superadmin" ? (data.sede ? resolveSede(data.sede) : null) : sede,
    creadoPor: data.creadoPor,
    fechaCreacion: new Date().toISOString(),
    activo: true,
  }
  const ref = await addDoc(collection(db, SYSTEM_USERS_COLLECTION), newUser)
  return normalizeSystemUser(ref.id, newUser as Record<string, unknown>)
}

export async function loginSystemUser(cedula: string, password: string): Promise<SystemUser | null> {
  const users = await getSystemUsers()
  const hash = simpleHash(password)
  const user = users.find((u) => u.cedula === cedula && u.passwordHash === hash && u.activo)
  return user ?? null
}

export async function toggleSystemUser(id: string, activo: boolean): Promise<void> {
  await updateDoc(doc(db, SYSTEM_USERS_COLLECTION, id), { activo })
}

// Inicializar superadmin por defecto si no existe ninguno
export async function ensureSuperAdmin(): Promise<void> {
  const users = await getSystemUsers()
  const hasSuperAdmin = users.some(u => u.rol === "superadmin")
  if (!hasSuperAdmin) {
    await createSystemUser({
      nombre: "Super Admin",
      cedula: "1007260358",
      password: "romanos812",
      rol: "superadmin",
      creadoPor: "sistema",
    })
  }
}

// Sesión en localStorage
const SESSION_KEY = "cducontrol_session"
const LEGACY_SESSION_KEY = "gymcontrol_session"

export function saveSession(user: SystemUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export function getSession(): SystemUser | null {
  if (typeof window === "undefined") return null
  let raw = localStorage.getItem(SESSION_KEY)
  if (!raw) {
    raw = localStorage.getItem(LEGACY_SESSION_KEY)
    if (raw) {
      localStorage.setItem(SESSION_KEY, raw)
      localStorage.removeItem(LEGACY_SESSION_KEY)
    }
  }
  if (!raw) return null
  try {
    return JSON.parse(raw) as SystemUser
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LEGACY_SESSION_KEY)
  }
}

export function canCreateRole(creatorRole: UserRole, targetRole: UserRole): boolean {
  if (creatorRole === "superadmin") return ["admin", "monitor", "encargado"].includes(targetRole)
  if (creatorRole === "admin") return ["monitor", "encargado"].includes(targetRole)
  return false
}

export function getRolesForCreator(creatorRole: UserRole): UserRole[] {
  if (creatorRole === "superadmin") return ["admin", "monitor", "encargado"]
  if (creatorRole === "admin") return ["monitor", "encargado"]
  return []
}
