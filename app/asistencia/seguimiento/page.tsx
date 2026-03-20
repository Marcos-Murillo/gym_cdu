"use client"

import { useEffect, useState, useMemo } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Clock, CalendarDays, TrendingUp, Filter } from "lucide-react"
import { getAttendanceRecords, getSystemUsers } from "@/lib/storage"
import type { AttendanceRecord, SystemUser } from "@/lib/types"

export default function SeguimientoAsistenciaPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin"]}>
      <SeguimientoContent />
    </RouteGuard>
  )
}

function startOfWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + 1)
  return d.toISOString().split("T")[0]
}

function startOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

function formatMin(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function SeguimientoContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [monitors, setMonitors] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filtroMonitor, setFiltroMonitor] = useState("todos")
  const [filtroEspacio, setFiltroEspacio] = useState("todos")
  const [filtroDesde, setFiltroDesde] = useState(startOfMonth())
  const [filtroHasta, setFiltroHasta] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    const load = async () => {
      const [recs, users] = await Promise.all([getAttendanceRecords(), getSystemUsers()])
      setRecords(recs)
      setMonitors(users.filter(u => u.rol === "monitor"))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => records.filter(r => {
    if (filtroMonitor !== "todos" && r.monitorId !== filtroMonitor) return false
    if (filtroEspacio !== "todos" && r.espacio !== filtroEspacio) return false
    if (r.fecha < filtroDesde || r.fecha > filtroHasta) return false
    return true
  }), [records, filtroMonitor, filtroEspacio, filtroDesde, filtroHasta])

  // KPIs globales del rango filtrado
  const totalDias = new Set(filtered.map(r => r.fecha)).size
  const totalMinutos = filtered.reduce((acc, r) => acc + (r.duracionMinutos ?? 0), 0)
  const sinSalida = filtered.filter(r => !r.horaSalida).length

  // Stats por monitor en el rango
  const statsPorMonitor = useMemo(() => {
    const map: Record<string, { nombre: string; espacio: string; dias: Set<string>; minutos: number; sinSalida: number }> = {}
    filtered.forEach(r => {
      if (!map[r.monitorId]) map[r.monitorId] = { nombre: r.monitorNombre, espacio: r.espacio, dias: new Set(), minutos: 0, sinSalida: 0 }
      map[r.monitorId].dias.add(r.fecha)
      map[r.monitorId].minutos += r.duracionMinutos ?? 0
      if (!r.horaSalida) map[r.monitorId].sinSalida++
    })
    return Object.entries(map).map(([id, s]) => ({ id, ...s, dias: s.dias.size }))
  }, [filtered])

  // Stats semana actual por monitor (independiente de filtros de fecha)
  const semanaRecords = records.filter(r => r.fecha >= startOfWeek())
  const minSemana = (monitorId: string) =>
    semanaRecords.filter(r => r.monitorId === monitorId).reduce((a, r) => a + (r.duracionMinutos ?? 0), 0)

  const mesRecords = records.filter(r => r.fecha >= startOfMonth())
  const minMes = (monitorId: string) =>
    mesRecords.filter(r => r.monitorId === monitorId).reduce((a, r) => a + (r.duracionMinutos ?? 0), 0)

  const espacios = [...new Set(records.map(r => r.espacio))]

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Seguimiento de Asistencias</h1>
          <p className="text-sm text-muted-foreground">Control de asistencia de monitores</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Monitor</Label>
            <Select value={filtroMonitor} onValueChange={setFiltroMonitor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {monitors.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Espacio</Label>
            <Select value={filtroEspacio} onValueChange={setFiltroEspacio}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {espacios.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Registros</p>
            <p className="text-2xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Días con asistencia</p>
            <p className="text-2xl font-bold text-emerald-600">{totalDias}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horas totales</p>
            <p className="text-2xl font-bold text-blue-600">{formatMin(totalMinutos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Sin salida</p>
            <p className="text-2xl font-bold text-orange-500">{sinSalida}</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen por monitor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Monitor</TableHead>
                <TableHead>Espacio</TableHead>
                <TableHead>Días (rango)</TableHead>
                <TableHead>Horas (rango)</TableHead>
                <TableHead>Horas semana</TableHead>
                <TableHead>Horas mes</TableHead>
                <TableHead>Sin salida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : statsPorMonitor.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin registros en el rango seleccionado.</TableCell></TableRow>
              ) : statsPorMonitor.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell><Badge variant="outline">{s.espacio}</Badge></TableCell>
                  <TableCell>{s.dias}</TableCell>
                  <TableCell>{formatMin(s.minutos)}</TableCell>
                  <TableCell className="text-blue-600">{formatMin(minSemana(s.id))}</TableCell>
                  <TableCell className="text-emerald-600">{formatMin(minMes(s.id))}</TableCell>
                  <TableCell>
                    {s.sinSalida > 0
                      ? <Badge className="bg-orange-100 text-orange-700">{s.sinSalida}</Badge>
                      : <Badge className="bg-emerald-100 text-emerald-700">0</Badge>
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalle de registros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle de registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monitor</TableHead>
                <TableHead>Espacio</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>Duración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin registros.</TableCell></TableRow>
              ) : [...filtered].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.fecha}</TableCell>
                  <TableCell className="font-medium">{r.monitorNombre}</TableCell>
                  <TableCell><Badge variant="outline">{r.espacio}</Badge></TableCell>
                  <TableCell className="font-mono">{r.horaEntrada}</TableCell>
                  <TableCell className="font-mono">
                    {r.horaSalida ?? <span className="text-orange-500 text-xs">Sin salida</span>}
                  </TableCell>
                  <TableCell>{r.duracionMinutos !== undefined ? formatMin(r.duracionMinutos) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
