"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { UserPlus, Users, ToggleLeft, ToggleRight } from "lucide-react"
import { createSystemUser, getSystemUsers, toggleSystemUser, getRolesForCreator } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import type { SystemUser, UserRole, Espacio } from "@/lib/types"

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  monitor: "Monitor",
  encargado: "Encargado",
}

const ESPACIO_LABELS: Record<Espacio, string> = {
  gimnasio: "Gimnasio",
  guardarropas: "Guardarropas",
  piscina: "Piscina",
}

const ROLES_CON_ESPACIO: UserRole[] = ["monitor", "encargado"]

interface UserManagementProps {
  title: string
}

export function UserManagement({ title }: UserManagementProps) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<SystemUser[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [nombre, setNombre] = useState("")
  const [cedula, setCedula] = useState("")
  const [password, setPassword] = useState("")
  const [rol, setRol] = useState<UserRole | "">("")
  const [espacio, setEspacio] = useState<Espacio | "">("")

  const availableRoles = currentUser ? getRolesForCreator(currentUser.rol) : []
  const needsEspacio = ROLES_CON_ESPACIO.includes(rol as UserRole)

  const loadUsers = async () => {
    const all = await getSystemUsers()
    // superadmin ve todos, admin no ve superadmins
    if (currentUser?.rol === "admin") {
      setUsers(all.filter(u => u.rol !== "superadmin"))
    } else {
      setUsers(all)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const resetForm = () => {
    setNombre("")
    setCedula("")
    setPassword("")
    setRol("")
    setEspacio("")
    setError("")
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !rol) return
    if (needsEspacio && !espacio) {
      setError("Debes asignar un espacio para este rol.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await createSystemUser({
        nombre,
        cedula,
        password,
        rol: rol as UserRole,
        espacio: needsEspacio ? (espacio as Espacio) : undefined,
        creadoPor: currentUser.id,
      })
      setSuccess("Usuario creado exitosamente.")
      setOpen(false)
      resetForm()
      loadUsers()
      setTimeout(() => setSuccess(""), 3000)
    } catch {
      setError("Error al crear el usuario.")
    }
    setLoading(false)
  }

  const handleToggle = async (u: SystemUser) => {
    await toggleSystemUser(u.id, !u.activo)
    loadUsers()
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Nombre completo" />
              </div>
              <div className="space-y-2">
                <Label>Cédula</Label>
                <Input value={cedula} onChange={e => setCedula(e.target.value)} required placeholder="Número de cédula" />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Contraseña" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={rol} onValueChange={v => { setRol(v as UserRole); setEspacio("") }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsEspacio && (
                <div className="space-y-2">
                  <Label>Espacio asignado</Label>
                  <Select value={espacio} onValueChange={v => setEspacio(v as Espacio)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar espacio" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ESPACIO_LABELS) as Espacio[]).map(e => (
                        <SelectItem key={e} value={e}>{ESPACIO_LABELS[e]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? "Creando..." : "Crear Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {success && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <AlertDescription className="text-emerald-700">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Espacio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell>{u.cedula}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{ROLE_LABELS[u.rol]}</Badge>
                  </TableCell>
                  <TableCell>{u.espacio ? ESPACIO_LABELS[u.espacio] : "—"}</TableCell>
                  <TableCell>
                    <Badge className={u.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.rol !== "superadmin" && (
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(u)}>
                        {u.activo ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay usuarios creados aún.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
