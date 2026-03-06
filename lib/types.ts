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
}

export interface AttendanceStats {
  totalUsuarios: number
  totalEntradas: number
  porGenero: Record<string, number>
  porEstamento: Record<string, number>
  porFacultad: Record<string, number>
  porPrograma: Record<string, number>
  entradasPorDia: { fecha: string; cantidad: number }[]
  entradasPorHora: { hora: string; cantidad: number }[]
}
