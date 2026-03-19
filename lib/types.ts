export type UserRole = "superadmin" | "admin" | "monitor" | "encargado"
export type Espacio = "gimnasio" | "guardarropas" | "piscina"

export interface SystemUser {
  id: string
  nombre: string
  cedula: string
  passwordHash: string
  rol: UserRole
  espacio?: Espacio
  creadoPor: string
  fechaCreacion: string
  activo: boolean
}

export interface UserProfile {
  id: string
  nombres: string
  correo: string
  genero: string
  tipoDocumento: string
  numeroDocumento: string
  edad: number
  telefono: string
  estamento: string
  facultad: string
  programaAcademico: string
  codigoEstudiantil?: string
  fechaRegistro: string
  activo: boolean
}

export interface BiometricData {
  id: string
  usuarioId: string
  fecha: string
  altura: number // en cm
  peso: number // en kg
  grasaCorporal: number // porcentaje
  masaMuscular: number // porcentaje
  imc: number // índice de masa corporal
  circunferenciaCintura: number // en cm
  circunferenciaCadera: number // en cm
  frecuenciaCardiacaReposo: number // bpm
  notas: string
}

export interface EntryRecord {
  id: string
  usuarioId: string
  fecha: string
  hora: string
  instalacion: "gimnasio" | "piscina"
}

export interface FormData {
  nombres: string
  correo: string
  genero: string
  tipoDocumento: string
  numeroDocumento: string
  edad: string
  telefono: string
  estamento: string
  facultad: string
  programaAcademico: string
  codigoEstudiantil: string
}

export interface LockerRecord {
  id: string
  casillero: string
  token: string
  usuarioId: string
  fechaIngreso: string
  horaIngreso: string
  estado: "ocupado" | "libre"
}

export interface AttendanceStats {
  totalUsuarios: number
  totalEntradas: number
  totalGimnasio: number
  totalPiscina: number
  porGenero: Record<string, number>
  porEstamento: Record<string, number>
  porFacultad: Record<string, number>
  porPrograma: Record<string, number>
  entradasPorDia: { fecha: string; cantidad: number }[]
  entradasPorHora: { hora: string; cantidad: number }[]
}
