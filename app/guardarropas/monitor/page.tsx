"use client"

import { useEffect, useState, useCallback } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package, AlertTriangle, BarChart3, Clock,
  RefreshCw, ArrowLeft, CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { getAllLockers, getUserById } from "@/lib/storage"
import type { LockerRecord, UserProfile } from "@/lib/types"

type LockerWithUser = LockerRecord & { usuario?: UserProfile }

function horasOcupado(fechaIngreso: string, horaIngreso: string): number {
  const ingreso = new Date(`${fechaIngreso}T${horaIngreso}`)
  return (Date.now() - ingreso.getTime()) / (1000 * 60 * 60)
}

function formatHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}min`
  return `${h.toFixed(1)}h`
}

export default function MonitorGuardarropasPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin"]}>
      <MonitorContent />
    </RouteGuard>
  )
}

function MonitorContent() {
  const [records, setRecords] = useState<LockerWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const load = useCallback(async () => {
    const all = await getAllLockers()
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
    setRecords(enriched)
    setLastUpdate(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh cada 60 segundos
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  const ocupados = records.filter(r => r.estado === "ocupado")
  const libres = records.filter(r => r.estado === "libre")
  const alertas = ocupados.filter(r => horasOcupado(r.fechaIngreso, r.horaIngreso) > 8)

  // Estadísticas por casillero
  const statsPorCasillero = records.reduce<Record<string, { usos: number; incidentes: number }>>((acc, r) => {
    if (!acc[r.casillero]) acc[r.casillero] = { usos: 0, incidentes: 0 }
    acc[r.casillero].usos++
    if (r.motivoLiberacion && r.motivoLiberacion.toLowerCase().includes("perdida")) {
      acc[r.casillero].incidentes++
    }
    return acc
  }, {})

  const incidentes = records.filter(r => r.motivoLiberacion && r.motivoLiberacion !== "liberado manualmente")

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/guardarropas/historial">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Monitor Guardarropas</h1>
            <p className="text-xs text-muted-foreground">
              Actualizado: {lastUpdate.toLocaleTimeString("es-CO")} · auto-refresh 60s
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total registros</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Ocupados ahora</p>
            <p className="text-2xl font-bold text-amber-600">{ocupados.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" /> Más de 8h
            </p>
            <p className="text-2xl font-bold text-red-600">{alertas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Incidentes</p>
            <p className="text-2xl font-bold text-orange-600">{incidentes.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiempo-real">
        <TabsList>
          <TabsTrigger value="tiempo-real">Tiempo real</TabsTrigger>
          <TabsTrigger value="alertas">
            Alertas {alertas.length > 0 && <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5">{alertas.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          <TabsTrigger value="incidentes">Incidentes</TabsTrigger>
        </TabsList>

        {/* Tab: Tiempo real */}
        <TabsContent value="tiempo-real" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ocupados.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>No hay casilleros ocupados</p>
              </div>
            ) : ocupados.map(r => {
              const horas = horasOcupado(r.fechaIngreso, r.horaIngreso)
              const esAlerta = horas > 8
              return (
                <Card key={r.id} className={`border-2 ${esAlerta ? "border-red-300 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-lg">{r.casillero}</span>
                      {esAlerta && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.usuario?.nombres ?? "—"}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className={esAlerta ? "text-red-600 font-semibold" : ""}>{formatHoras(horas)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="mt-4">
          <div className="space-y-3">
            {alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>Sin alertas activas</p>
              </div>
            ) : alertas.map(r => {
              const horas = horasOcupado(r.fechaIngreso, r.horaIngreso)
              return (
                <Card key={r.id} className="border-red-200 bg-red-50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                      <div>
                        <p className="font-semibold">Casillero {r.casillero}</p>
                        <p className="text-sm text-muted-foreground">{r.usuario?.nombres ?? "Usuario desconocido"}</p>
                        <p className="text-xs text-muted-foreground">Doc: {r.usuario?.numeroDocumento ?? "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600 font-bold text-lg">{formatHoras(horas)}</p>
                      <p className="text-xs text-muted-foreground">desde {r.horaIngreso}</p>
                      <p className="text-xs text-muted-foreground">{r.fechaIngreso}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Tab: Estadísticas por casillero */}
        <TabsContent value="estadisticas" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Uso por casillero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(statsPorCasillero)
                  .sort(([, a], [, b]) => b.usos - a.usos)
                  .map(([casillero, stats]) => (
                    <div key={casillero} className="flex items-center gap-3">
                      <span className="font-mono w-16 text-sm font-semibold">{casillero}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${Math.min((stats.usos / Math.max(...Object.values(statsPorCasillero).map(s => s.usos))) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-16 text-right">{stats.usos} usos</span>
                      {stats.incidentes > 0 && (
                        <Badge className="bg-red-100 text-red-700 text-xs">{stats.incidentes} inc.</Badge>
                      )}
                    </div>
                  ))}
                {Object.keys(statsPorCasillero).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Sin datos aún.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Incidentes */}
        <TabsContent value="incidentes" className="mt-4">
          <div className="space-y-3">
            {incidentes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>Sin incidentes registrados</p>
              </div>
            ) : incidentes.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Casillero {r.casillero}</p>
                      <p className="text-sm text-muted-foreground">{r.usuario?.nombres ?? "—"}</p>
                      <p className="text-xs text-orange-700 font-medium mt-0.5">{r.motivoLiberacion}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{r.fechaIngreso}</p>
                    {r.fechaLiberacion && (
                      <p>{new Date(r.fechaLiberacion).toLocaleDateString("es-CO")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
