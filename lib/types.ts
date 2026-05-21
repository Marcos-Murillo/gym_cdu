export type UserRole = "superadmin" | "admin" | "monitor" | "encargado"
export type Espacio = "gimnasio" | "guardarropas" | "piscina" | "tenis_mesa"

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
  motivoLiberacion?: string
  fechaLiberacion?: string
}

export interface AttendanceRecord {
  id: string
  monitorId: string
  monitorNombre: string
  espacio: string
  fecha: string
  horaEntrada: string
  horaSalida?: string
  duracionMinutos?: number
}

export interface TableTennisLoan {
  id: string
  mesa: number
  raqueta1: number
  raqueta2: number
  usuario1Id: string
  usuario2Id: string
  usuario1Nombre: string
  usuario2Nombre: string
  usuario1Documento: string
  usuario2Documento: string
  fecha: string
  horaInicio: string
  horaFin: string
  estado: "activo" | "devuelto" | "vencido"
  monitorId?: string
  monitorNombre?: string
  devueltoAt?: string
}

export interface TableTennisReport {
  id: string
  loanId: string
  mesa: number
  raqueta1: number
  raqueta2: number
  usuario1Nombre: string
  usuario2Nombre: string
  usuario1Documento: string
  usuario2Documento: string
  fecha: string
  horaInicio: string
  horaFin: string
  fechaReporte: string
  horaReporte: string
  generadoPor?: string
}

export interface AttendanceStats {
  totalUsuarios: number
  totalEntradas: number
  totalGimnasio: number
  totalPiscina: number
  totalTenisMesa?: number
  reportesTenisMesa?: number
  prestamosActivosTenis?: number
  usuariosUnicos?: number
  usuariosUnicosGimnasio?: number
  usuariosUnicosPiscina?: number
  usuariosUnicosTenisMesa?: number
  porGenero: Record<string, number>
  porEstamento: Record<string, number>
  porFacultad: Record<string, number>
  porPrograma: Record<string, number>
  entradasPorDia: { fecha: string; cantidad: number }[]
  entradasPorHora: { hora: string; cantidad: number }[]
}
