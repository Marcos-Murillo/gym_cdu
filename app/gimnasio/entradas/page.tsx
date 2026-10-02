"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DoorOpen, RefreshCw, Search } from "lucide-react"
import { getEntriesByDate, getUsers } from "@/lib/storage"
import { SEDE_LABELS, resolveSede } from "@/lib/sede"
import { useOperatingSede } from "@/lib/sede-context"
import { localDateISO } from "@/lib/utils"
import type { UserProfile } from "@/lib/types"

const HORAS = Array.from({ length: 16 }, (_, i) => String(i + 6).padStart(2, "0"))

type EntradaVista = {
  id: string
  hora: string
  nombre: string
  documento: string
  codigo: string
}

export default function EntradasGimnasioPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "monitor"]}>
      <EntradasContent />
    </RouteGuard>
  )
}

function EntradasContent() {
  const { sede } = useOperatingSede()
  const [fecha, setFecha] = useState(() => localDateISO())
  const [nombre, setNombre] = useState("")
  const [hora, setHora] = useState("todas")
  const [rows, setRows] = useState<EntradaVista[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setError("")
    try {
      const [entries, users] = await Promise.all([getEntriesByDate(fecha), getUsers()])
      const byId = new Map<string, UserProfile>(users.map((u) => [u.id, u]))
      const day = entries
        .filter((e) => (e.instalacion ?? "gimnasio") === "gimnasio")
        .filter((e) => resolveSede(e.sede) === sede)
        .filter((e) => e.fecha === fecha)
        .map((e) => {
          const usuario = byId.get(e.usuarioId)
          return {
            id: e.id,
            hora: e.hora ?? "",
            nombre: usuario?.nombres ?? "Sin nombre",
            documento: usuario?.numeroDocumento ?? "—",
            codigo: usuario?.codigoEstudiantil ?? "",
          }
        })
        .sort((a, b) => b.hora.localeCompare(a.hora))
      setRows(day)
      setLastUpdate(new Date())
    } catch {
      setRows([])
      setError("No se pudieron cargar las entradas. Intenta actualizar.")
    }
    setLoading(false)
  }, [fecha, sede])

  useEffect(() => {
    setLoading(true)
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [load])

  const visibles = useMemo(() => {
    const q = nombre.trim().toLowerCase()
    return rows.filter((r) => {
      if (q && !r.nombre.toLowerCase().includes(q)) return false
      if (hora !== "todas" && !r.hora.startsWith(`${hora}:`)) return false
      return true
    })
  }, [rows, nombre, hora])

  const fechaLabel = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
            <DoorOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Entradas al gimnasio</h1>
            <p className="text-sm text-muted-foreground">
              Sede {SEDE_LABELS[sede]} · {fechaLabel}
              {lastUpdate && ` · actualizado ${lastUpdate.toLocaleTimeString("es-CO")}`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            La fecha siempre filtra el día elegido. Por defecto es hoy y se actualiza sola cada 20 segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value || localDateISO())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Buscar por nombre"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Hora</Label>
            <Select value={hora} onValueChange={setHora}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las horas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las horas</SelectItem>
                {HORAS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Badge variant="secondary">{visibles.length} entradas</Badge>
        {nombre.trim() || hora !== "todas" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNombre("")
              setHora("todas")
            }}
          >
            Limpiar nombre y hora
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-6">
          {error ? (
            <p className="py-10 text-center text-destructive">{error}</p>
          ) : loading && rows.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Cargando entradas...</p>
          ) : visibles.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              {`No hay entradas de gimnasio para esta fecha${nombre.trim() ? " con ese nombre" : ""}${hora !== "todas" ? ` a las ${hora}:00` : ""}.`}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Código</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.hora.slice(0, 5) || "—"}</TableCell>
                    <TableCell>{r.nombre}</TableCell>
                    <TableCell>{r.documento}</TableCell>
                    <TableCell>{r.codigo || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
