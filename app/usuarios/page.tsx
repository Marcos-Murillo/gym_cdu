"use client"

import { useEffect, useState, useMemo } from "react"
import { RouteGuard } from "@/components/route-guard"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
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
  Eye,
  Trash2
} from "lucide-react"
import { filterUsers, getUsers, getUserServiceUsageCounts } from "@/lib/storage"
import type { UserServiceUsage } from "@/lib/storage"
import { ESTAMENTOS, FACULTADES, PROGRAMAS_POR_FACULTAD } from "@/lib/data"
import type { UserProfile } from "@/lib/types"

type ServicioFiltro = "todos" | "gimnasio" | "piscina" | "guardarropas" | "tenis_mesa"

export default function UsuariosPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin"]}>
      <UsuariosContent />
    </RouteGuard>
  )
}

function UsuariosContent() {
  const { user } = useAuth()
  const isSuperAdmin = user?.rol === "superadmin"

  const [usuarios, setUsuarios] = useState<UserProfile[]>([])
  const [baseFilteredUsers, setBaseFilteredUsers] = useState<UserProfile[]>([])
  const [usageByUser, setUsageByUser] = useState<Record<string, UserServiceUsage>>({})
  const [servicioFiltro, setServicioFiltro] = useState<ServicioFiltro>("todos")
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filtros
  const [nombre, setNombre] = useState("")
  const [estamento, setEstamento] = useState("")
  const [facultad, setFacultad] = useState("")
  const [programa, setPrograma] = useState("")

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getUsers()
      setUsuarios(users)
      setBaseFilteredUsers(users)
      setLoading(false)
    }
    loadUsers()
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) {
      setUsageByUser({})
      setServicioFiltro("todos")
      return
    }
    let cancelled = false
    getUserServiceUsageCounts().then((counts) => {
      if (!cancelled) setUsageByUser(counts)
    })
    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  useEffect(() => {
    const applyFilters = async () => {
      const filtered = await filterUsers({
        nombre,
        estamento: estamento || undefined,
        facultad: facultad || undefined,
        programa: programa || undefined,
      })
      setBaseFilteredUsers(filtered)
    }
    applyFilters()
  }, [nombre, estamento, facultad, programa])

  const filteredUsuarios = useMemo(() => {
    if (!isSuperAdmin || servicioFiltro === "todos") return baseFilteredUsers
    return baseFilteredUsers.filter((u) => (usageByUser[u.id]?.[servicioFiltro] ?? 0) > 0)
  }, [baseFilteredUsers, isSuperAdmin, servicioFiltro, usageByUser])

  const clearFilters = () => {
    setNombre("")
    setEstamento("")
    setFacultad("")
    setPrograma("")
    setServicioFiltro("todos")
  }

  const handleViewUser = (usuario: UserProfile) => {
    setSelectedUser(usuario)
    setDialogOpen(true)
  }

  const handleDeleteClick = (usuario: UserProfile) => {
    // Cerrar el diálogo de vista si está abierto
    if (dialogOpen) {
      setDialogOpen(false)
      setSelectedUser(null)
    }
    
    // Esperar a que se cierre completamente antes de abrir el de eliminación
    setTimeout(() => {
      setUserToDelete(usuario)
      setDeleteDialogOpen(true)
    }, 150)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    
    setDeleting(true)
    try {
      // Eliminar usuario completamente de la base de datos usando deleteDoc directamente
      const { deleteDoc, doc } = await import("firebase/firestore")
      const { db } = await import("@/lib/firebase")
      const docRef = doc(db, "users", userToDelete.id)
      await deleteDoc(docRef)
      
      // Cerrar el diálogo y limpiar estado
      setDeleteDialogOpen(false)
      
      // Esperar a que el diálogo se cierre antes de actualizar la lista
      setTimeout(async () => {
        setUserToDelete(null)
        
        // Recargar usuarios
        const users = await getUsers()
        setUsuarios(users)
        
        // Aplicar filtros nuevamente
        const filtered = await filterUsers({
          nombre,
          estamento: estamento || undefined,
          facultad: facultad || undefined,
          programa: programa || undefined,
        })
        setBaseFilteredUsers(filtered)
      }, 150)
    } catch (error) {
      console.error("Error al eliminar usuario:", error)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const hasActiveFilters =
    nombre || estamento || facultad || programa || (isSuperAdmin && servicioFiltro !== "todos")

  const usageFor = (usuarioId: string): UserServiceUsage =>
    usageByUser[usuarioId] ?? { gimnasio: 0, piscina: 0, guardarropas: 0, tenis_mesa: 0 }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Cargando usuarios...</div>
      </div>
    )
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
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
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isSuperAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
          >
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

            {isSuperAdmin && (
              <div className="space-y-2 md:col-span-2 lg:col-span-1">
                <Label htmlFor="servicio">Servicio</Label>
                <Select
                  value={servicioFiltro}
                  onValueChange={(v) => setServicioFiltro(v as ServicioFiltro)}
                >
                  <SelectTrigger id="servicio">
                    <SelectValue placeholder="Todos los servicios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los servicios</SelectItem>
                    <SelectItem value="piscina">Piscina</SelectItem>
                    <SelectItem value="gimnasio">Gimnasio</SelectItem>
                    <SelectItem value="guardarropas">Guardarropas</SelectItem>
                    <SelectItem value="tenis_mesa">Tenis de mesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 p-0">
            <Table containerClassName="overflow-x-hidden" className="w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-0 px-2 py-2 align-middle whitespace-normal">
                    Usuario
                  </TableHead>
                  <TableHead
                    className={`shrink-0 px-2 py-2 text-left align-middle whitespace-normal ${
                      isSuperAdmin ? "w-[5.5rem]" : "w-[7rem]"
                    }`}
                  >
                    Estamento
                  </TableHead>
                  {isSuperAdmin && (
                    <>
                      <TableHead
                        className="w-[3.25rem] shrink-0 px-1 py-2 text-center align-middle whitespace-normal text-xs leading-tight"
                        title="Entradas a piscina"
                      >
                        Piscina
                      </TableHead>
                      <TableHead
                        className="w-[3.25rem] shrink-0 px-1 py-2 text-center align-middle whitespace-normal text-xs leading-tight"
                        title="Entradas a gimnasio"
                      >
                        Gimnasio
                      </TableHead>
                      <TableHead
                        className="hidden w-[4rem] shrink-0 px-1 py-2 text-center align-middle whitespace-normal text-xs leading-tight sm:table-cell"
                        title="Usos de guardarropas"
                      >
                        Guardarropas
                      </TableHead>
                      <TableHead
                        className="hidden w-[4rem] shrink-0 px-1 py-2 text-center align-middle whitespace-normal text-xs leading-tight lg:table-cell"
                        title="Préstamos tenis de mesa"
                      >
                        Tenis
                      </TableHead>
                    </>
                  )}
                  <TableHead className="hidden min-w-0 px-2 py-2 whitespace-normal md:table-cell">
                    Contacto
                  </TableHead>
                  <TableHead className="w-11 shrink-0 px-1 py-2 text-center align-middle">
                    <span className="sr-only">Acciones</span>
                    <span className="text-muted-foreground text-lg leading-none" aria-hidden>
                      ⋮
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="min-w-0 px-2 py-2 align-middle whitespace-normal">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center sm:h-9 sm:w-9">
                          <User className="h-4 w-4 text-emerald-600 sm:h-[18px] sm:w-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground text-sm leading-tight">
                            {usuario.nombres}
                          </p>
                          <div className="mt-0.5 space-y-0.5 text-muted-foreground text-[11px] leading-snug sm:text-xs">
                            {usuario.codigoEstudiantil && (
                              <p className="truncate font-mono text-emerald-600">
                                {usuario.codigoEstudiantil}
                              </p>
                            )}
                            {usuario.facultad && usuario.facultad !== "N/A" && (
                              <p className="truncate">{usuario.facultad.replace("FACULTAD DE ", "")}</p>
                            )}
                            {usuario.programaAcademico && usuario.programaAcademico !== "N/A" && (
                              <p className="truncate">{usuario.programaAcademico}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`shrink-0 px-2 py-2 align-middle whitespace-normal ${
                        isSuperAdmin ? "w-[5.5rem]" : "w-[7rem]"
                      }`}
                    >
                      <Badge
                        variant="secondary"
                        className="block max-w-full truncate px-1.5 py-0 text-center text-[10px] font-normal leading-tight sm:text-xs"
                      >
                        {usuario.estamento}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <>
                        <TableCell className="w-[3.25rem] shrink-0 px-1 py-2 text-center align-middle">
                          <span className="inline-flex min-h-[1.5rem] w-full max-w-[3rem] items-center justify-center rounded-md bg-blue-100 px-1 py-0.5 text-xs font-semibold text-blue-800 tabular-nums">
                            {usageFor(usuario.id).piscina}
                          </span>
                        </TableCell>
                        <TableCell className="w-[3.25rem] shrink-0 px-1 py-2 text-center align-middle">
                          <span className="inline-flex min-h-[1.5rem] w-full max-w-[3rem] items-center justify-center rounded-md bg-orange-100 px-1 py-0.5 text-xs font-semibold text-orange-800 tabular-nums">
                            {usageFor(usuario.id).gimnasio}
                          </span>
                        </TableCell>
                        <TableCell className="hidden w-[4rem] shrink-0 px-1 py-2 text-center align-middle sm:table-cell">
                          <span className="inline-flex min-h-[1.5rem] w-full max-w-[3.5rem] items-center justify-center rounded-md bg-slate-100 px-1 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
                            {usageFor(usuario.id).guardarropas}
                          </span>
                        </TableCell>
                        <TableCell className="hidden w-[4rem] shrink-0 px-1 py-2 text-center align-middle lg:table-cell">
                          <span className="inline-flex min-h-[1.5rem] w-full max-w-[3.5rem] items-center justify-center rounded-md bg-violet-100 px-1 py-0.5 text-xs font-semibold text-violet-800 tabular-nums">
                            {usageFor(usuario.id).tenis_mesa}
                          </span>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="hidden min-w-0 px-2 py-2 whitespace-normal md:table-cell">
                      <div className="min-w-0 space-y-0.5 text-xs">
                        <p className="break-all text-muted-foreground">{usuario.correo}</p>
                        <p className="truncate text-muted-foreground">{usuario.telefono}</p>
                      </div>
                    </TableCell>
                    <TableCell className="w-11 shrink-0 px-1 py-2 text-center align-middle">
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(usuario)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar usuario
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
      <Dialog key={`view-${selectedUser?.id || 'none'}`} open={dialogOpen} onOpenChange={setDialogOpen}>
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

                {selectedUser.codigoEstudiantil && (
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-muted-foreground">Codigo Estudiantil</Label>
                    <p className="text-sm font-mono text-emerald-600">{selectedUser.codigoEstudiantil}</p>
                  </div>
                )}

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

      {/* Dialog de confirmación para eliminar */}
      <Dialog key={`delete-${userToDelete?.id || 'none'}`} open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer y se eliminará permanentemente de la base de datos.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">{userToDelete.nombres}</p>
                  <p className="text-sm text-muted-foreground">{userToDelete.correo}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar Permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
