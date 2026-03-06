"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Search, 
  Filter,
  User,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Calendar,
  X
} from "lucide-react"
import { filterUsers, getUsers } from "@/lib/storage"
import { ESTAMENTOS, FACULTADES, PROGRAMAS_POR_FACULTAD } from "@/lib/data"
import type { UserProfile } from "@/lib/types"

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [filteredUsuarios, setFilteredUsuarios] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Filtros
  const [nombre, setNombre] = useState("")
  const [estamento, setEstamento] = useState("")
  const [facultad, setFacultad] = useState("")
  const [programa, setPrograma] = useState("")

  useEffect(() => {
    const loadUsers = () => {
      const users = getUsers()
      setUsuarios(users)
      setFilteredUsuarios(users)
      setLoading(false)
    }
    loadUsers()
  }, [])

  useEffect(() => {
    const filtered = filterUsers({
      nombre,
      estamento: estamento || undefined,
      facultad: facultad || undefined,
      programa: programa || undefined,
    })
    setFilteredUsuarios(filtered)
  }, [nombre, estamento, facultad, programa])

  const clearFilters = () => {
    setNombre("")
    setEstamento("")
    setFacultad("")
    setPrograma("")
  }

  const hasActiveFilters = nombre || estamento || facultad || programa

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Usuarios Registrados</h1>
        <p className="text-muted-foreground">Listado de todos los usuarios del gimnasio</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Filtros</CardTitle>
                <CardDescription>Busca y filtra usuarios</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                {showFilters ? "Ocultar" : "Mostrar"} filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`space-y-4 ${showFilters ? "block" : "hidden md:block"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estamento">Estamento</Label>
              <Select value={estamento} onValueChange={setEstamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estamentos</SelectItem>
                  {ESTAMENTOS.map((est) => (
                    <SelectItem key={est} value={est}>
                      {est}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facultad">Facultad</Label>
              <Select value={facultad} onValueChange={(value) => {
                setFacultad(value)
                setPrograma("")
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las facultades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las facultades</SelectItem>
                  {FACULTADES.map((fac) => (
                    <SelectItem key={fac} value={fac}>
                      {fac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="programa">Programa</Label>
              <Select 
                value={programa} 
                onValueChange={setPrograma}
                disabled={!facultad || facultad === "TODOS"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los programas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los programas</SelectItem>
                  {facultad && facultad !== "TODOS" && PROGRAMAS_POR_FACULTAD[facultad]?.map((prog) => (
                    <SelectItem key={prog} value={prog}>
                      {prog}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
        </p>
        {hasActiveFilters && (
          <Badge variant="secondary">
            Filtros activos
          </Badge>
        )}
      </div>

      {/* Lista de usuarios */}
      {filteredUsuarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsuarios.map((usuario) => (
            <Card key={usuario.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <User className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{usuario.nombres}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {usuario.estamento}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{usuario.correo}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{usuario.telefono}</span>
                    </div>
                    {usuario.facultad && usuario.facultad !== "N/A" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{usuario.facultad.replace("FACULTAD DE ", "")}</span>
                      </div>
                    )}
                    {usuario.programaAcademico && usuario.programaAcademico !== "N/A" && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-4 w-4 shrink-0" />
                        <span className="truncate">{usuario.programaAcademico}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Registrado: {new Date(usuario.fechaRegistro).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">No se encontraron usuarios</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters 
                    ? "Intenta modificar los filtros de busqueda"
                    : "Aun no hay usuarios registrados en el sistema"}
                </p>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
