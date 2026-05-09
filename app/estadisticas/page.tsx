"use client"

import { useEffect, useState } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  DoorOpen,
  UserCheck,
  TrendingUp,
  Building2,
  GraduationCap,
  Clock,
  Calendar,
  Dumbbell,
  Waves,
  FileDown,
  Loader2,
} from "lucide-react"
import { generateStats } from "@/lib/storage"
import { generateGymPDFReport } from "@/lib/pdf-generator"
import type { AttendanceStats } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

type Filtro = "todas" | "gimnasio" | "piscina"

export default function EstadisticasPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "encargado"]}>
      <EstadisticasContent />
    </RouteGuard>
  )
}

function EstadisticasContent() {
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      const instalacion = filtro === "todas" ? undefined : filtro
      const data = await generateStats(instalacion)
      setStats(data)
      setLoading(false)
    }
    loadStats()
  }, [filtro])

  const accentColor = filtro === "piscina" ? "cyan" : "emerald"

  const handleGeneratePDF = async () => {
    if (!stats) return
    setPdfLoading(true)
    try {
      generateGymPDFReport(stats, filtro)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Cargando estadisticas...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Error al cargar las estadisticas</div>
      </div>
    )
  }

  const generoData = Object.entries(stats.porGenero).map(([name, value]) => ({ name, value }))
  const estamentoData = Object.entries(stats.porEstamento).map(([name, value]) => ({ name, value }))
  const facultadData = Object.entries(stats.porFacultad)
    .map(([name, value]) => ({ name: name.replace("FACULTAD DE ", ""), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Estadisticas Generales</h1>
        <p className="text-muted-foreground">Resumen de usuarios y entradas registradas</p>
      </div>

      {/* Filtro de instalacion */}
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant={filtro === "todas" ? "default" : "outline"}
          onClick={() => setFiltro("todas")}
          className={filtro === "todas" ? "bg-slate-700 hover:bg-slate-800" : ""}
        >
          Todas
        </Button>
        <Button
          variant={filtro === "gimnasio" ? "default" : "outline"}
          onClick={() => setFiltro("gimnasio")}
          className={filtro === "gimnasio" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          <Dumbbell className="h-4 w-4 mr-2" />
          Gimnasio
        </Button>
        <Button
          variant={filtro === "piscina" ? "default" : "outline"}
          onClick={() => setFiltro("piscina")}
          className={filtro === "piscina" ? "bg-cyan-600 hover:bg-cyan-700" : ""}
        >
          <Waves className="h-4 w-4 mr-2" />
          Piscina
        </Button>
        <Button
          variant="outline"
          onClick={handleGeneratePDF}
          disabled={pdfLoading}
          className="border-rose-300 text-rose-600 hover:bg-rose-50"
        >
          {pdfLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          Generar PDF
        </Button>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalUsuarios}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DoorOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {filtro === "todas" ? "Total Entradas" : filtro === "gimnasio" ? "Entradas Gimnasio" : "Entradas Piscina"}
                </p>
                <p className="text-3xl font-bold text-foreground">{stats.totalEntradas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {filtro === "todas" ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gimnasio</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalGimnasio}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <Waves className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Piscina</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalPiscina}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-lg ${filtro === "piscina" ? "bg-cyan-100" : "bg-emerald-100"} flex items-center justify-center`}>
                    <Users className={`h-6 w-6 ${filtro === "piscina" ? "text-cyan-600" : "text-emerald-600"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuarios Únicos</p>
                    <p className="text-3xl font-bold text-foreground">{stats.usuariosUnicos ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Promedio Diario</p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.entradasPorDia.length > 0
                        ? Math.round(stats.totalEntradas / stats.entradasPorDia.length)
                        : 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Graficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Distribucion por Genero
            </CardTitle>
            <CardDescription>Usuarios registrados por genero</CardDescription>
          </CardHeader>
          <CardContent>
            {generoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={generoData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {generoData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">No hay datos disponibles</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Distribucion por Estamento
            </CardTitle>
            <CardDescription>Usuarios registrados por estamento</CardDescription>
          </CardHeader>
          <CardContent>
            {estamentoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={estamentoData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">No hay datos disponibles</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Entradas por Dia
            </CardTitle>
            <CardDescription>Registro de entradas en los ultimos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.entradasPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.entradasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value: string) => value.slice(5)}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cantidad"
                    stroke={filtro === "piscina" ? "#0891b2" : "#3b82f6"}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Entradas"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">No hay datos disponibles</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Entradas por Hora
            </CardTitle>
            <CardDescription>Distribucion de entradas por hora del dia</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.entradasPorHora.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.entradasPorHora}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Entradas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">No hay datos disponibles</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Usuarios por Facultad
          </CardTitle>
          <CardDescription>Distribucion de usuarios por facultad</CardDescription>
        </CardHeader>
        <CardContent>
          {facultadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={facultadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Usuarios" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">No hay datos disponibles</div>
          )}
        </CardContent>
      </Card>

      {Object.keys(stats.porPrograma).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Usuarios por Programa Academico
            </CardTitle>
            <CardDescription>Top programas con mas usuarios registrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(stats.porPrograma)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 12)
                .map(([programa, cantidad]) => (
                  <div
                    key={programa}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm font-medium truncate flex-1">{programa}</span>
                    <Badge variant="secondary" className="ml-2">{cantidad}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
