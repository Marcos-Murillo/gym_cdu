"use client"

import { useEffect, useState } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import {
  Package, MoreVertical, Eye, Unlock, Search,
  User, Hash, Calendar, Clock, AlertTriangle, ExternalLink
} from "lucide-react"
import Link from "next/link"
import { getAllLockers, releaseLocker, getUserById } from "@/lib/storage"
import type { LockerRecord, UserProfile } from "@/lib/types"

type LockerWithUser = LockerRecord & { usuario?: UserProfile }

function horasOcupado(fechaIngreso: string, horaIngreso: string): number {
  const ingreso = new Date(`${fechaIngreso}T${horaIngreso}`)
  return (Date.now() - ingreso.getTime()) / (1000 * 60 * 60)
}

export default function HistorialGuardarropasPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin"]}>
      <HistorialContent />
    </RouteGuard>
  )
}

function HistorialContent() {
  const [records, setRecords] = useState<LockerWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroCasillero, setFiltroCasillero] = useState("")
  const [viewRecord, setViewRecord] = useState<LockerWithUser | null>(null)
  const [releaseTarget, setReleaseTarget] = useState<LockerWithUser | null>(null)
  const [motivo, setMotivo] = useState("")
  const [releasing, setReleasing] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")

  const load = async () => {
    setLoading(true)
    const all = await getAllLockers()
    // Enriquecer con datos de usuario
    const enriched: LockerWithUser[] = await Promise.all(
      all.map(async (r) => {
        try {
          const usuario = await getUserById(r.usuarioId)
          return { ...r, usuario }
        } catch {
          return r
        }
      })
    )
    // Ordenar: ocupados primero, luego por fecha desc
    enriched.sort((a, b) => {
      if (a.estado === "ocupado" && b.estado !== "ocupado") return -1
      if (a.estado !== "ocupado" && b.estado === "ocupado") return 1
      return new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime()
    })
    setRecords(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = records.filter(r => {
    if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false
    if (filtroCasillero && !r.casillero.toLowerCase().includes(filtroCasillero.toLowerCase())) return false
    return true
  })

  const handleRelease = async () => {
    if (!releaseTarget) return
    setReleasing(true)
    await releaseLocker(releaseTarget.id, motivo || "Liberado manualmente por administrador")
    setReleasing(false)
    setReleaseTarget(null)
    setMotivo("")
    setSuccessMsg("Casillero liberado correctamente.")
    setTimeout(() => setSuccessMsg(""), 3000)
    load()
  }

  const ocupados = records.filter(r => r.estado === "ocupado").length
  const libres = records.filter(r => r.estado === "libre").length
  const alertas = records.filter(r => r.estado === "ocupado" && horasOcupado(r.fechaIngreso, r.horaIngreso) > 8).length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Historial Guardarropas</h1>
            <p className="text-sm text-muted-foreground">Gestión y seguimiento de casilleros</p>
          </div>
        </div>
        <Link href="/guardarropas/monitor">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Monitor en tiempo real
          </Button>
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Ocupados</p>
            <p className="text-2xl font-bold text-amber-600">{ocupados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground">Liberados</p>
            <p className="text-2xl font-bold text-emerald-600">{libres}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" /> Más de 8h
            </p>
            <p className="text-2xl font-bold text-red-600">{alertas}</p>
          </CardContent>
        </Card>
      </div>

      {successMsg && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <AlertDescription className="text-emerald-700">{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar casillero..."
            value={filtroCasillero}
            onChange={e => setFiltroCasillero(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ocupado">Ocupados</SelectItem>
            <SelectItem value="libre">Liberados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Casillero</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Fecha ingreso</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No hay registros.</TableCell>
                </TableRow>
              ) : filtered.map(r => {
                const horas = r.estado === "ocupado" ? horasOcupado(r.fechaIngreso, r.horaIngreso) : 0
                const esAlerta = r.estado === "ocupado" && horas > 8
                return (
                  <TableRow key={r.id} className={esAlerta ? "bg-red-50" : ""}>
                    <TableCell className="font-mono font-semibold">{r.casillero}</TableCell>
                    <TableCell>{r.usuario?.nombres ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{r.usuario?.numeroDocumento ?? (r.usuarioId?.slice(0, 8) ?? "—")}</TableCell>
                    <TableCell>{r.fechaIngreso}</TableCell>
                    <TableCell>{r.horaIngreso}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge className={r.estado === "ocupado" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                          {r.estado === "ocupado" ? "Ocupado" : "Libre"}
                        </Badge>
                        {esAlerta && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
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
                          <DropdownMenuItem onClick={() => setViewRecord(r)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver registro
                          </DropdownMenuItem>
                          {r.estado === "ocupado" && (
                            <DropdownMenuItem onClick={() => { setReleaseTarget(r); setMotivo("") }} className="text-amber-600">
                              <Unlock className="h-4 w-4 mr-2" />
                              Liberar casillero
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Ver registro */}
      <Dialog open={!!viewRecord} onOpenChange={v => !v && setViewRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle del registro</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Casillero</p>
                    <p className="font-mono font-semibold">{viewRecord.casillero}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Token</p>
                    <p className="font-mono font-semibold">{viewRecord.token}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 col-span-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Usuario</p>
                    <p className="font-medium">{viewRecord.usuario?.nombres ?? "Desconocido"}</p>
                    <p className="text-xs text-muted-foreground">{viewRecord.usuario?.numeroDocumento}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha ingreso</p>
                    <p className="font-medium">{viewRecord.fechaIngreso}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Hora ingreso</p>
                    <p className="font-medium">{viewRecord.horaIngreso}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <Badge className={viewRecord.estado === "ocupado" ? "bg-amber-100 text-amber-700 mt-1" : "bg-emerald-100 text-emerald-700 mt-1"}>
                      {viewRecord.estado === "ocupado" ? "Ocupado" : "Libre"}
                    </Badge>
                  </div>
                </div>
                {viewRecord.motivoLiberacion && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Motivo liberación</p>
                      <p className="font-medium">{viewRecord.motivoLiberacion}</p>
                    </div>
                  </div>
                )}
                {viewRecord.fechaLiberacion && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 col-span-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fecha liberación</p>
                      <p className="font-medium">{new Date(viewRecord.fechaLiberacion).toLocaleString("es-CO")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Liberar casillero */}
      <Dialog open={!!releaseTarget} onOpenChange={v => !v && setReleaseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liberar casillero {releaseTarget?.casillero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Esto marcará el casillero como libre y quedará disponible para otro usuario. El historial se conserva.
            </p>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Llave perdida">Llave perdida</SelectItem>
                  <SelectItem value="Persona olvidó retirar">Persona olvidó retirar</SelectItem>
                  <SelectItem value="Liberado por administrador">Liberado por administrador</SelectItem>
                  <SelectItem value="Error de registro">Error de registro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseTarget(null)} disabled={releasing}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleRelease} disabled={releasing}>
              <Unlock className="h-4 w-4 mr-2" />
              {releasing ? "Liberando..." : "Liberar casillero"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
