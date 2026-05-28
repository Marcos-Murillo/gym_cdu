"use client"

import { useEffect, useState } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Users, DoorOpen, UserCheck, Building2, GraduationCap,
  Clock, Calendar, Dumbbell, Waves, FileDown, Loader2, CircleDot, Table2,
  MoreVertical, SlidersHorizontal,
} from "lucide-react"
import { generateStats, getUsers, getUserServiceUsageCounts } from "@/lib/storage"
import { generateTableTennisStats } from "@/lib/table-tennis-storage"
import { generateGymPDFReport, generateGymPDFReportCompleto } from "@/lib/pdf-generator"
import {
  exportUsersUsageExcel,
  GYM_EXCEL_OPTIONAL_COLUMNS,
  usageKeyFromFiltro,
} from "@/lib/excel-generator"
import { ExcelColumnSelector } from "@/components/excel-column-selector"
import type { AttendanceStats } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import {
  canViewAllSedes,
  getStaffSede,
  SEDE_LABELS,
  SEDES_ACTIVAS,
  type Sede,
  type SedeFiltro,
} from "@/lib/sede"
import { guardarropasAppliesToSede } from "@/lib/sede-rules"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

type Filtro = "todas" | "gimnasio" | "piscina" | "tenis_mesa"

export default function EstadisticasPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "encargado"]}>
      <EstadisticasContent />
    </RouteGuard>
  )
}

function EstadisticasContent() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const [filtroSede, setFiltroSede] = useState<SedeFiltro>("todas")
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfCompleto, setPdfCompleto] = useState(false)
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [excelDialogOpen, setExcelDialogOpen] = useState(false)
  const [excelFechaDesde, setExcelFechaDesde] = useState("")
  const [excelFechaHasta, setExcelFechaHasta] = useState("")
  const [excelLoading, setExcelLoading] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advFacultad, setAdvFacultad] = useState("TODOS")
  const [advPrograma, setAdvPrograma] = useState("TODOS")

  const puedeVerTodasSedes = user ? canViewAllSedes(user.rol) : false
  const sedeEfectiva: SedeFiltro = puedeVerTodasSedes ? filtroSede : getStaffSede(user)
  const includeGuardarropas = guardarropasAppliesToSede(sedeEfectiva)
  const hasAdvancedFilters = advFacultad !== "TODOS" || advPrograma !== "TODOS"

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      if (filtro === "tenis_mesa") {
        const data = await generateTableTennisStats(
          undefined,
          undefined,
          sedeEfectiva,
        )
        setStats(data)
      } else {
        const instalacion = filtro === "todas" ? undefined : filtro
        const data = await generateStats(instalacion, undefined, undefined, sedeEfectiva)
        setStats(data)
      }
      setLoading(false)
    }
    if (user) loadStats()
  }, [filtro, sedeEfectiva, user])

  const handleOpenPdfDialog = () => {
    setFechaDesde("")
    setFechaHasta("")
    setPdfCompleto(false)
    setPdfDialogOpen(true)
  }

  const handleGeneratePDF = async () => {
    if (!stats || !user) return
    setPdfLoading(true)
    setPdfDialogOpen(false)
    try {
      const range = { desde: fechaDesde || undefined, hasta: fechaHasta || undefined }
      const desde = fechaDesde || undefined
      const hasta = fechaHasta || undefined

      if (pdfCompleto && puedeVerTodasSedes && filtroSede === "todas") {
        const loadFor = async (sede: SedeFiltro) =>
          filtro === "tenis_mesa"
            ? generateTableTennisStats(desde, hasta, sede)
            : generateStats(
                filtro === "todas" ? undefined : filtro,
                desde,
                hasta,
                sede,
              )
        const [global, melendez, sanFernando] = await Promise.all([
          loadFor("todas"),
          loadFor("melendez"),
          loadFor("san_fernando"),
        ])
        generateGymPDFReportCompleto(global, melendez, sanFernando, filtro, range)
      } else {
        const statsWithRange =
          filtro === "tenis_mesa"
            ? await generateTableTennisStats(desde, hasta, sedeEfectiva)
            : await generateStats(
                filtro === "todas" ? undefined : filtro,
                desde,
                hasta,
                sedeEfectiva,
              )
        const sedeLabel =
          sedeEfectiva === "todas" ? "Todas las sedes" : SEDE_LABELS[sedeEfectiva as Sede]
        generateGymPDFReport(statsWithRange, filtro, range, sedeLabel)
      }
    } finally {
      setPdfLoading(false)
    }
  }

  const handleOpenExcelDialog = () => {
    setExcelFechaDesde("")
    setExcelFechaHasta("")
    setExcelDialogOpen(true)
  }

  const handleDownloadExcel = async (selectedColumns: string[]) => {
    if (!user) return
    setExcelLoading(true)
    try {
      const [users, usageByUser] = await Promise.all([
        getUsers(),
        getUserServiceUsageCounts(
          sedeEfectiva,
          excelFechaDesde || undefined,
          excelFechaHasta || undefined,
        ),
      ])

      const filtroLabel =
        filtro === "todas"
          ? "Todas"
          : filtro === "gimnasio"
            ? "Gimnasio"
            : filtro === "piscina"
              ? "Piscina"
              : "Tenis_de_mesa"
      const sedeLabel =
        sedeEfectiva === "todas" ? "Todas_sedes" : SEDE_LABELS[sedeEfectiva as Sede].replace(/ /g, "_")
      const rangeSuffix =
        excelFechaDesde || excelFechaHasta
          ? `${excelFechaDesde || "inicio"}_${excelFechaHasta || "hoy"}`
          : "completo"

      exportUsersUsageExcel(users, usageByUser, selectedColumns, {
        fileSuffix: `${filtroLabel}_${sedeLabel}_${rangeSuffix}`,
        minUsageKey: usageKeyFromFiltro(filtro),
        includeGuardarropas,
        facultad: advFacultad !== "TODOS" ? advFacultad : undefined,
        programa: advPrograma !== "TODOS" ? advPrograma : undefined,
      })
      setExcelDialogOpen(false)
    } finally {
      setExcelLoading(false)
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

  const facultadOptions = Object.keys(stats.porFacultad).filter(Boolean).sort()
  const programaOptions = Object.keys(stats.porPrograma).filter(Boolean).sort()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Estadisticas Generales</h1>
        <p className="text-muted-foreground">
          Resumen de usuarios y entradas registradas
          {!puedeVerTodasSedes && user && (
            <> · Sede <strong>{SEDE_LABELS[getStaffSede(user)]}</strong></>
          )}
        </p>
      </div>

      {puedeVerTodasSedes && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant={filtroSede === "todas" ? "default" : "outline"}
            onClick={() => setFiltroSede("todas")}
            className={filtroSede === "todas" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            Todas las sedes
          </Button>
          {SEDES_ACTIVAS.map((s) => (
            <Button
              key={s}
              variant={filtroSede === s ? "default" : "outline"}
              onClick={() => setFiltroSede(s)}
              className={filtroSede === s ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              {SEDE_LABELS[s]}
            </Button>
          ))}
        </div>
      )}

      {/* Filtros + exportación */}
      <div className="flex flex-wrap justify-center items-center gap-2">
        <DropdownMenu open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" title="Filtros avanzados">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-72 p-3">
            <DropdownMenuLabel className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros avanzados
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-3 px-1 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Facultad</Label>
                <Select value={advFacultad} onValueChange={setAdvFacultad}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas</SelectItem>
                    {facultadOptions.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.replace("FACULTAD DE ", "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Programa</Label>
                <Select value={advPrograma} onValueChange={setAdvPrograma}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {programaOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setAdvFacultad("TODOS")
                  setAdvPrograma("TODOS")
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {hasAdvancedFilters && (
          <Badge variant="secondary" className="text-xs">
            Filtros: {advFacultad !== "TODOS" ? "facultad" : ""}{" "}
            {advPrograma !== "TODOS" ? "programa" : ""}
          </Badge>
        )}
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
          variant={filtro === "tenis_mesa" ? "default" : "outline"}
          onClick={() => setFiltro("tenis_mesa")}
          className={filtro === "tenis_mesa" ? "bg-violet-600 hover:bg-violet-700" : ""}
        >
          <CircleDot className="h-4 w-4 mr-2" />
          Tenis de mesa
        </Button>
        <Button
          variant="outline"
          onClick={handleOpenPdfDialog}
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

        <Button
          variant="outline"
          onClick={handleOpenExcelDialog}
          disabled={excelLoading}
          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          {excelLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Table2 className="h-4 w-4 mr-2" />
          )}
          Descargar Excel
        </Button>
      </div>

      {/* Diálogo Excel */}
      <Dialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Descargar Excel de usuarios</DialogTitle>
            <DialogDescription>
              Selecciona el rango de fechas y las columnas adicionales. Los nombres se exportan en
              mayúscula e incluyen los usos por espacio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="excelFechaDesde">Desde</Label>
                <Input
                  id="excelFechaDesde"
                  type="date"
                  value={excelFechaDesde}
                  onChange={(e) => setExcelFechaDesde(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excelFechaHasta">Hasta</Label>
                <Input
                  id="excelFechaHasta"
                  type="date"
                  value={excelFechaHasta}
                  onChange={(e) => setExcelFechaHasta(e.target.value)}
                />
              </div>
            </div>
            <ExcelColumnSelector
              availableColumns={GYM_EXCEL_OPTIONAL_COLUMNS}
              onDownload={handleDownloadExcel}
              disabled={excelLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcelDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo rango de fechas */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rango de fechas del reporte</DialogTitle>
            <DialogDescription>
              Opcional. Deja en blanco para incluir todos los datos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fechaDesde">Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaHasta">Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            {puedeVerTodasSedes && filtroSede === "todas" && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfCompleto}
                  onChange={(e) => setPdfCompleto(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Incluir resumen institucional + desglose por sede (Melendez y San Fernando)
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGeneratePDF}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {filtro === "todas"
                    ? "Total Entradas"
                    : filtro === "gimnasio"
                      ? "Entradas Gimnasio"
                      : filtro === "piscina"
                        ? "Entradas Piscina"
                        : "Actividad Tenis de mesa"}
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
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-violet-100 flex items-center justify-center">
                    <CircleDot className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tenis de mesa</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalTenisMesa ?? 0}</p>
                    {(stats.prestamosActivosTenis ?? 0) > 0 && (
                      <p className="text-xs text-violet-600">{stats.prestamosActivosTenis} activos</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : filtro === "tenis_mesa" ? (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuarios únicos</p>
                    <p className="text-3xl font-bold text-foreground">{stats.usuariosUnicosTenisMesa ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Préstamos activos</p>
                    <p className="text-3xl font-bold text-foreground">{stats.prestamosActivosTenis ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Table2 className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mesa más usada</p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.mesaMasUsada != null ? `Mesa ${stats.mesaMasUsada}` : "—"}
                    </p>
                    {(stats.usosMesaMasUsada ?? 0) > 0 && (
                      <p className="text-xs text-violet-600">
                        {stats.usosMesaMasUsada} {stats.usosMesaMasUsada === 1 ? "uso" : "usos"} en el período
                      </p>
                    )}
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
                  <XAxis dataKey="fecha" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
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
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
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
                  <div key={programa} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
