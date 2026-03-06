"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  X,
  MoreVertical,
  Eye
} from "lucide-react"
import { filterUsers, getUsers } from "@/lib/storage"
import { ESTAMENTOS, FACULTADES, PROGRAMAS_POR_FACULTAD } from "@/lib/data"
import type { UserProfile } from "@/lib/types"

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [filteredUsuarios, setFilteredUsuarios] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filtros
  const [nombre, setNombre] = useState("")
  const [estamento, setEstamento] = useState("")
  const [facultad, setFacultad] = useState("")
  const [programa, setPrograma] = useState("")

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getUsers()
      setUsuarios(users)
      setFilteredUsuarios(users)
      setLoading(false)
    }
    loadUsers()
  }, [])

  useEffect(() => {
    const applyFilters = async () => {
      const filtered = await filterUsers({
        nombre,
        estamento: estamento || undefined,
        facultad: facultad || undefined,
        programa: programa || undefined,
      })
      setFilteredUsuarios(filtered)
    }
    applyFilters()
  }, [nombre, estamento, facultad, programa])

  const clearFilters = () => {
    setNombre("")
    setEstamento("")
    setFacultad("")
    setPrograma("")
  }

  const handleViewUser = (usuario: UserProfile) => {
    setSelectedUser(usuario)
    setDialogOpen(true)
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

      {/* Tabla de usuarios */}
      {filteredUsuarios.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estamento</TableHead>
                  <TableHead className="hidden md:table-cell">Contacto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{usuario.nombres}</p>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            {usuario.facultad && usuario.facultad !== "N/A" && (
                              <p className="truncate">{usuario.facultad.replace("FACULTAD DE ", "")}</p>
                            )}
                            {usuario.programaAcademico && usuario.programaAcademico !== "N/A" && (
                              <p className="truncate text-xs">{usuario.programaAcademico}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{usuario.estamento}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground truncate">{usuario.correo}</p>
                        <p className="text-muted-foreground">{usuario.telefono}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewUser(usuario)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver usuario
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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

      {/* Dialog para ver detalles del usuario */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
            <DialogDescription>Informacion completa del usuario registrado</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.nombres}</h3>
                  <Badge variant="secondary" className="mt-1">{selectedUser.estamento}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Correo Electronico</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{selectedUser.correo}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Telefono</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{selectedUser.telefono}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Genero</Label>
                  <p className="text-sm">{selectedUser.genero}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Edad</Label>
                  <p className="text-sm">{selectedUser.edad} años</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Tipo de Documento</Label>
                  <p className="text-sm">{selectedUser.tipoDocumento}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Numero de Documento</Label>
                  <p className="text-sm font-mono">{selectedUser.numeroDocumento}</p>
                </div>

                {selectedUser.facultad && selectedUser.facultad !== "N/A" && (
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">Facultad</Label>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selectedUser.facultad}</p>
                    </div>
                  </div>
                )}

                {selectedUser.programaAcademico && selectedUser.programaAcademico !== "N/A" && (
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">Programa Academico</Label>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selectedUser.programaAcademico}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1 md:col-span-2">
                  <Label className="text-muted-foreground">Fecha de Registro</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">
                      {new Date(selectedUser.fechaRegistro).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
