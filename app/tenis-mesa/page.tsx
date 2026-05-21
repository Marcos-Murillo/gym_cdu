"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  Table2,
  Bell,
} from "lucide-react"
import type { TableTennisLoan, TableTennisReport, UserProfile } from "@/lib/types"
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
  getTableTennisReports,
  returnTableTennisPaddles,
} from "@/lib/table-tennis-storage"

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
  const [activos, setActivos] = useState<TableTennisLoan[]>([])
  const [reportes, setReportes] = useState<TableTennisReport[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())
  const [expiryAlert, setExpiryAlert] = useState<string | null>(null)

  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const [busqueda1, setBusqueda1] = useState("")
  const [busqueda2, setBusqueda2] = useState("")
  const [usuario1, setUsuario1] = useState<UserProfile | null>(null)
  const [usuario2, setUsuario2] = useState<UserProfile | null>(null)
  const [error1, setError1] = useState("")
  const [error2, setError2] = useState("")
  const [errorPrestamo, setErrorPrestamo] = useState("")
  const [buscando1, setBuscando1] = useState(false)
  const [buscando2, setBuscando2] = useState(false)
  const [prestando, setPrestando] = useState(false)
  const [successPrestamo, setSuccessPrestamo] = useState(false)

  const mesasOcupadas = useMemo(() => new Set(activos.map((l) => l.mesa)), [activos])

  const loadData = useCallback(async () => {
    const [a, r] = await Promise.all([getActiveTableTennisLoans(), getTableTennisReports()])
    setActivos(a)
    setReportes(r)
    setLoadingData(false)
  }, [])

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

  const buscarUsuario = async (
    term: string,
    slot: 1 | 2,
  ) => {
    if (!term.trim()) return
    if (slot === 1) {
      setError1("")
      setUsuario1(null)
      setBuscando1(true)
    } else {
      setError2("")
      setUsuario2(null)
      setBuscando2(true)
    }
    try {
      const storage = await import("@/lib/storage")
      const found = await storage.searchUserByCode(term.trim())
      if (!found) {
        const msg = "Usuario no registrado. Debe estar en el sistema."
        if (slot === 1) setError1(msg)
        else setError2(msg)
      } else if (
        (slot === 1 && usuario2?.id === found.id) ||
        (slot === 2 && usuario1?.id === found.id)
      ) {
        const msg = "Esta persona ya fue agregada."
        if (slot === 1) setError1(msg)
        else setError2(msg)
      } else if (slot === 1) {
        setUsuario1(found)
      } else {
        setUsuario2(found)
      }
    } catch {
      const msg = "Error al buscar."
      if (slot === 1) setError1(msg)
      else setError2(msg)
    }
    if (slot === 1) setBuscando1(false)
    else setBuscando2(false)
  }

  const handlePrestar = async () => {
    if (!mesaSel || !usuario1 || !usuario2) return
    setErrorPrestamo("")
    setPrestando(true)
    setSuccessPrestamo(false)
    try {
      await createTableTennisLoan({
        mesa: mesaSel,
        usuario1,
        usuario2,
        monitorId: user?.id,
        monitorNombre: user?.nombre,
      })
      setSuccessPrestamo(true)
      setMesaSel(null)
      setBusqueda1("")
      setBusqueda2("")
      setUsuario1(null)
      setUsuario2(null)
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
          8 mesas · 16 raquetas · préstamo de 1 hora · 2 usuarios por mesa
        </p>
      </div>

      {expiryAlert && (
        <Alert className="border-amber-300 bg-amber-50">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Tiempo de préstamo finalizado</AlertTitle>
          <AlertDescription className="text-amber-700">{expiryAlert}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="prestamo">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prestamo">Nuevo préstamo</TabsTrigger>
          <TabsTrigger value="activos">
            Activos
            {activos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reportes">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="prestamo" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-violet-600" />
                Seleccionar mesa
              </CardTitle>
              <CardDescription>
                Cada mesa incluye 2 raquetas numeradas consecutivamente
              </CardDescription>
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
                  Raquetas {raquetasForMesa(mesaSel)[0]} y {raquetasForMesa(mesaSel)[1]} · duración 1 hora
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TableTennisUserSearch
                  id="tenis-busqueda-1"
                  label="Persona 1 (registrada en el sistema)"
                  busqueda={busqueda1}
                  onBusquedaChange={setBusqueda1}
                  usuario={usuario1}
                  onClearUsuario={() => {
                    setUsuario1(null)
                    setBusqueda1("")
                  }}
                  error={error1}
                  onClearError={() => setError1("")}
                  buscando={buscando1}
                  onSearch={() => buscarUsuario(busqueda1, 1)}
                />
                <TableTennisUserSearch
                  id="tenis-busqueda-2"
                  label="Persona 2 (registrada en el sistema)"
                  busqueda={busqueda2}
                  onBusquedaChange={setBusqueda2}
                  usuario={usuario2}
                  onClearUsuario={() => {
                    setUsuario2(null)
                    setBusqueda2("")
                  }}
                  error={error2}
                  onClearError={() => setError2("")}
                  buscando={buscando2}
                  onSearch={() => buscarUsuario(busqueda2, 2)}
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
                  disabled={!usuario1 || !usuario2 || prestando}
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
                            <div className="flex items-center gap-2 flex-wrap">
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
                            <p className="mt-2 text-sm">
                              <span className="font-medium">{loan.usuario1Nombre}</span>
                              {" · "}
                              <span className="font-medium">{loan.usuario2Nombre}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {loan.fecha} · inicio {loan.horaInicio} · fin {loan.horaFin}
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

        <TabsContent value="reportes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportes de no devolución</CardTitle>
              <CardDescription>
                Registro cuando el tiempo venció y las raquetas no fueron devueltas
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
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Fecha préstamo</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Reporte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportes.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {r.mesa} (R{r.raqueta1}-{r.raqueta2})
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{r.usuario1Nombre}</p>
                            <p className="text-muted-foreground">{r.usuario1Documento}</p>
                            <p className="mt-1">{r.usuario2Nombre}</p>
                            <p className="text-muted-foreground">{r.usuario2Documento}</p>
                          </div>
                        </TableCell>
                        <TableCell>{r.fecha}</TableCell>
                        <TableCell>
                          {r.horaInicio} – {r.horaFin}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.fechaReporte} {r.horaReporte}
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
