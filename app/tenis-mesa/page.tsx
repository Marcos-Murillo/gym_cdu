"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { RouteGuard } from "@/components/route-guard"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TableTennisUserSearch } from "@/components/table-tennis-user-search"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CircleDot,
  CheckCircle2,
  Clock,
  FileWarning,
  History,
  Table2,
  Bell,
  DoorOpen,
} from "lucide-react"
import type { TableTennisHistoryEntry, TableTennisLoan, TableTennisReport } from "@/lib/types"
import {
  TOTAL_MESAS,
  formatMinutosRestantes,
  minutosRestantes,
  prestamoVencido,
  raquetasForMesa,
} from "@/lib/table-tennis-utils"
import {
  createTableTennisLoan,
  createTableTennisReport,
  getActiveTableTennisLoans,
  getTableTennisHistory,
  getTableTennisReports,
  loanUsuarioDocumento,
  loanUsuarioNombre,
  returnTableTennisPaddles,
} from "@/lib/table-tennis-storage"
import { getStaffSede, SEDE_LABELS } from "@/lib/sede"

export default function TenisMesaPage() {
  return (
    <RouteGuard
      allowedRoles={["superadmin", "admin", "monitor"]}
      requiredEspacioOrAdmin="tenis_mesa"
    >
      <TenisMesaContent />
    </RouteGuard>
  )
}

function TenisMesaContent() {
  const { user } = useAuth()
  const staffSede = getStaffSede(user)
  const [activos, setActivos] = useState<TableTennisLoan[]>([])
  const [reportes, setReportes] = useState<TableTennisReport[]>([])
  const [historial, setHistorial] = useState<TableTennisHistoryEntry[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())
  const [expiryAlert, setExpiryAlert] = useState<string | null>(null)

  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [usuario, setUsuario] = useState<import("@/lib/types").UserProfile | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState("")
  const [errorPrestamo, setErrorPrestamo] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [prestando, setPrestando] = useState(false)
  const [successPrestamo, setSuccessPrestamo] = useState(false)

  const mesasOcupadas = useMemo(() => new Set(activos.map((l) => l.mesa)), [activos])

  const loadData = useCallback(async () => {
    const [a, r, h] = await Promise.all([
      getActiveTableTennisLoans(staffSede),
      getTableTennisReports(staffSede),
      getTableTennisHistory(staffSede),
    ])
    setActivos(a)
    setReportes(r)
    setHistorial(h)
    setLoadingData(false)
  }, [staffSede])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  useEffect(() => {
    const tick = () => {
      const vencidos = activos.filter((l) => prestamoVencido(l.fecha, l.horaFin))
      if (vencidos.length === 0) {
        setExpiryAlert(null)
        return
      }
      const nuevos = vencidos.filter((l) => !notifiedIds.has(l.id))
      if (nuevos.length > 0) {
        const mesas = nuevos.map((l) => l.mesa).join(", ")
        setExpiryAlert(
          `El tiempo de préstamo terminó en mesa(s): ${mesas}. Registra devolución o genera reporte.`,
        )
        setNotifiedIds((prev) => {
          const next = new Set(prev)
          nuevos.forEach((l) => next.add(l.id))
          return next
        })
      }
    }
    tick()
    const interval = setInterval(tick, 10000)
    return () => clearInterval(interval)
  }, [activos, notifiedIds])

  const buscarUsuario = async () => {
    if (!busqueda.trim()) return
    setErrorBusqueda("")
    setUsuario(null)
    setBuscando(true)
    try {
      const storage = await import("@/lib/storage")
      const found = await storage.searchUserByCode(busqueda.trim())
      if (!found) {
        setErrorBusqueda("Usuario no registrado. Debe registrarse primero.")
      } else {
        setUsuario(found)
      }
    } catch {
      setErrorBusqueda("Error al buscar.")
    }
    setBuscando(false)
  }

  const handlePrestar = async () => {
    if (!mesaSel || !usuario) return
    setErrorPrestamo("")
    setPrestando(true)
    setSuccessPrestamo(false)
    try {
      await createTableTennisLoan({
        mesa: mesaSel,
        usuario,
        sede: staffSede,
        monitorId: user?.id,
        monitorNombre: user?.nombre,
      })
      setSuccessPrestamo(true)
      setMesaSel(null)
      setBusqueda("")
      setUsuario(null)
      await loadData()
      setTimeout(() => setSuccessPrestamo(false), 4000)
    } catch (err) {
      setErrorPrestamo(err instanceof Error ? err.message : "No se pudo registrar el préstamo.")
    }
    setPrestando(false)
  }

  const handleDevolver = async (loan: TableTennisLoan) => {
    await returnTableTennisPaddles(loan.id)
    setNotifiedIds((prev) => {
      const next = new Set(prev)
      next.delete(loan.id)
      return next
    })
    await loadData()
  }

  const handleReporte = async (loan: TableTennisLoan) => {
    await createTableTennisReport(loan, user?.nombre)
    setNotifiedIds((prev) => {
      const next = new Set(prev)
      next.delete(loan.id)
      return next
    })
    await loadData()
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Tenis de mesa</h1>
        <p className="text-muted-foreground">
          8 mesas · 16 raquetas · préstamo 1 hora · Sede {SEDE_LABELS[staffSede]}
        </p>
        <Link
          href="/tenis-mesa/acceso"
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-violet-600 hover:underline"
        >
          <DoorOpen className="h-4 w-4" />
          Abrir control de acceso (público)
        </Link>
      </div>

      {expiryAlert && (
        <Alert className="border-amber-300 bg-amber-50">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Tiempo de préstamo finalizado</AlertTitle>
          <AlertDescription className="text-amber-700">{expiryAlert}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="prestamo">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="prestamo">Nuevo préstamo</TabsTrigger>
          <TabsTrigger value="activos">
            Activos
            {activos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="prestamo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-violet-600" />
                Seleccionar mesa
              </CardTitle>
              <CardDescription>Mesas 1 a {TOTAL_MESAS} · 2 raquetas por mesa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {Array.from({ length: TOTAL_MESAS }, (_, i) => i + 1).map((n) => {
                  const ocupada = mesasOcupadas.has(n)
                  const [r1, r2] = raquetasForMesa(n)
                  const selected = mesaSel === n
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={ocupada}
                      onClick={() => setMesaSel(n)}
                      className={`rounded-lg border p-3 text-center transition ${
                        ocupada
                          ? "opacity-40 cursor-not-allowed bg-muted"
                          : selected
                            ? "border-violet-600 bg-violet-50 ring-2 ring-violet-400"
                            : "hover:border-violet-300 hover:bg-violet-50/50"
                      }`}
                    >
                      <p className="font-bold text-lg">{n}</p>
                      <p className="text-[10px] text-muted-foreground">
                        R{r1}-{r2}
                      </p>
                      {ocupada && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Ocupada
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {mesaSel && (
            <Card>
              <CardHeader>
                <CardTitle>Mesa {mesaSel}</CardTitle>
                <CardDescription>
                  Raquetas {raquetasForMesa(mesaSel)[0]} y {raquetasForMesa(mesaSel)[1]} · 1 hora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TableTennisUserSearch
                  id="tenis-busqueda-prestamo"
                  label="Usuario (registrado en el sistema)"
                  busqueda={busqueda}
                  onBusquedaChange={setBusqueda}
                  usuario={usuario}
                  onClearUsuario={() => {
                    setUsuario(null)
                    setBusqueda("")
                  }}
                  error={errorBusqueda}
                  onClearError={() => setErrorBusqueda("")}
                  buscando={buscando}
                  onSearch={buscarUsuario}
                />

                {errorPrestamo && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorPrestamo}</AlertDescription>
                  </Alert>
                )}
                {successPrestamo && (
                  <Alert className="border-emerald-300 bg-emerald-50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription>Préstamo registrado correctamente.</AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  disabled={!usuario || prestando}
                  onClick={handlePrestar}
                >
                  <CircleDot className="h-4 w-4 mr-2" />
                  {prestando ? "Registrando..." : "Registrar préstamo (1 hora)"}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activos" className="space-y-4 mt-4">
          {loadingData ? (
            <p className="text-center text-muted-foreground">Cargando...</p>
          ) : activos.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No hay préstamos activos.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activos
                .sort((a, b) => a.mesa - b.mesa)
                .map((loan) => {
                  const vencido = prestamoVencido(loan.fecha, loan.horaFin)
                  const mins = minutosRestantes(loan.fecha, loan.horaFin)
                  return (
                    <Card
                      key={loan.id}
                      className={vencido ? "border-amber-400 bg-amber-50/30" : ""}
                    >
                      <CardContent className="pt-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-violet-600">Mesa {loan.mesa}</Badge>
                              <Badge variant="outline">
                                Raquetas {loan.raqueta1} y {loan.raqueta2}
                              </Badge>
                              {vencido ? (
                                <Badge variant="destructive">Tiempo agotado</Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatMinutosRestantes(mins)}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-sm font-medium">
                              {loanUsuarioNombre(loan)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {loanUsuarioDocumento(loan)} · {loan.fecha} · {loan.horaInicio} –{" "}
                              {loan.horaFin}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleDevolver(loan)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Raquetas regresadas
                            </Button>
                            {vencido && (
                              <Button
                                variant="outline"
                                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                                onClick={() => handleReporte(loan)}
                              >
                                <FileWarning className="h-4 w-4 mr-2" />
                                Generar reporte
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de uso y préstamos
              </CardTitle>
              <CardDescription>
                Accesos del control público y préstamos de mesa/raquetas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-center text-muted-foreground py-8">Cargando...</p>
              ) : historial.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin registros.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Mesa</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((entry) =>
                      entry.tipo === "acceso" ? (
                        <TableRow key={`a-${entry.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="border-blue-300 text-blue-700">
                              Acceso
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{entry.usuarioNombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.usuarioDocumento}
                            </p>
                          </TableCell>
                          <TableCell>{entry.mesa}</TableCell>
                          <TableCell>{entry.fecha}</TableCell>
                          <TableCell>{entry.hora}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            Control de acceso
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={`p-${entry.id}`}>
                          <TableCell>
                            <Badge className="bg-violet-600">Préstamo</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{loanUsuarioNombre(entry)}</p>
                            <p className="text-xs text-muted-foreground">
                              {loanUsuarioDocumento(entry)}
                            </p>
                          </TableCell>
                          <TableCell>{entry.mesa}</TableCell>
                          <TableCell>{entry.fecha}</TableCell>
                          <TableCell>{entry.horaInicio}</TableCell>
                          <TableCell className="text-xs">
                            R{entry.raqueta1}-{entry.raqueta2} · {entry.estado}
                            {entry.horaFin ? ` · fin ${entry.horaFin}` : ""}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reportes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportes de no devolución</CardTitle>
              <CardDescription>
                Cuando el tiempo venció y las raquetas no fueron devueltas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin reportes.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mesa</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha préstamo</TableHead>
                      <TableHead>Horario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportes.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.mesa} (R{r.raqueta1}-{r.raqueta2})
                        </TableCell>
                        <TableCell>
                          <p>{r.usuarioNombre ?? r.usuario1Nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.usuarioDocumento ?? r.usuario1Documento}
                          </p>
                        </TableCell>
                        <TableCell>{r.fecha}</TableCell>
                        <TableCell>
                          {r.horaInicio} – {r.horaFin}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
