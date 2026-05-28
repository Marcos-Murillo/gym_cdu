"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TableTennisUserSearch } from "@/components/table-tennis-user-search"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  CircleDot,
  Clock,
  DoorOpen,
  FileWarning,
  History,
  Package,
  Settings,
  Table2,
} from "lucide-react"
import type {
  SfTableTennisPaddle,
  SfTableTennisTable,
  SystemUser,
  TableTennisHistoryEntry,
  TableTennisLoan,
  TableTennisReport,
} from "@/lib/types"
import {
  createSfTableTennisLoan,
  getSfPaddles,
  getSfTables,
  returnSfPaddle,
} from "@/lib/sf-table-tennis-inventory"
import {
  getActiveTableTennisLoans,
  getTableTennisHistory,
  getTableTennisReports,
  loanUsuarioDocumento,
  loanUsuarioNombre,
} from "@/lib/table-tennis-storage"
import {
  formatMinutosRestantes,
  minutosRestantes,
  prestamoVencido,
} from "@/lib/table-tennis-utils"
import { SEDE_LABELS } from "@/lib/sede"
import { SF_SEDE } from "@/lib/sede-rules"

function formatSfRaquetas(loan: TableTennisLoan): string {
  if (loan.paddleSerials?.length) return loan.paddleSerials.join(", ")
  return "—"
}

function formatReportRaqueta(r: TableTennisReport): string {
  if (r.paddleSerial) return `Serie ${r.paddleSerial}`
  if (r.raqueta1 || r.raqueta2) return `R${r.raqueta1}-${r.raqueta2}`
  return "—"
}

export function TenisMesaSfOperations({ user }: { user: SystemUser | null }) {
  const [tables, setTables] = useState<SfTableTennisTable[]>([])
  const [paddles, setPaddles] = useState<SfTableTennisPaddle[]>([])
  const [activos, setActivos] = useState<TableTennisLoan[]>([])
  const [historial, setHistorial] = useState<TableTennisHistoryEntry[]>([])
  const [reportes, setReportes] = useState<TableTennisReport[]>([])
  const [loading, setLoading] = useState(true)

  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const [selectedPaddleIds, setSelectedPaddleIds] = useState<Set<string>>(new Set())
  const [busqueda, setBusqueda] = useState("")
  const [usuario, setUsuario] = useState<import("@/lib/types").UserProfile | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState("")
  const [errorPrestamo, setErrorPrestamo] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [prestando, setPrestando] = useState(false)

  const [returnDialog, setReturnDialog] = useState<{
    loan: TableTennisLoan
    paddleId: string
    serial: string
  } | null>(null)
  const [damageNote, setDamageNote] = useState("")
  const [returning, setReturning] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [t, p, a, h, r] = await Promise.all([
        getSfTables(),
        getSfPaddles(),
        getActiveTableTennisLoans(SF_SEDE),
        getTableTennisHistory(SF_SEDE),
        getTableTennisReports(SF_SEDE),
      ])
      setTables(t)
      setPaddles(p)
      setActivos(a.filter((l) => l.inventoryMode === "dynamic"))
      setHistorial(h)
      setReportes(r)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  const mesasOcupadas = useMemo(
    () => new Set(activos.map((l) => l.mesa)),
    [activos],
  )

  const paddlesForMesa = useMemo(() => {
    if (!mesaSel) return []
    const table = tables.find((t) => t.numero === mesaSel)
    if (!table) return []
    return paddles.filter((p) => p.tableId === table.id && p.estado === "disponible")
  }, [mesaSel, tables, paddles])

  const togglePaddle = (id: string) => {
    setSelectedPaddleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }

  const buscarUsuario = async () => {
    if (!busqueda.trim()) return
    setErrorBusqueda("")
    setUsuario(null)
    setBuscando(true)
    try {
      const storage = await import("@/lib/storage")
      const found = await storage.searchUserByCode(busqueda.trim())
      if (!found) setErrorBusqueda("Usuario no registrado.")
      else setUsuario(found)
    } catch {
      setErrorBusqueda("Error al buscar.")
    }
    setBuscando(false)
  }

  const handlePrestar = async () => {
    if (!mesaSel || !usuario || selectedPaddleIds.size === 0) return
    setErrorPrestamo("")
    setPrestando(true)
    try {
      await createSfTableTennisLoan({
        mesaNumero: mesaSel,
        paddleIds: Array.from(selectedPaddleIds),
        usuario,
        monitorId: user?.id,
        monitorNombre: user?.nombre,
      })
      setMesaSel(null)
      setSelectedPaddleIds(new Set())
      setBusqueda("")
      setUsuario(null)
      await loadData()
    } catch (err) {
      setErrorPrestamo(err instanceof Error ? err.message : "No se pudo registrar el préstamo.")
    }
    setPrestando(false)
  }

  const confirmReturn = async (reportDamage: boolean) => {
    if (!returnDialog) return
    setReturning(true)
    try {
      await returnSfPaddle({
        loan: returnDialog.loan,
        paddleId: returnDialog.paddleId,
        reportDamage,
        damageDescription: damageNote,
        generadoPor: user?.nombre,
      })
      setReturnDialog(null)
      setDamageNote("")
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al devolver")
    }
    setReturning(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Tenis de mesa</h1>
        <p className="text-muted-foreground">
          Inventario dinámico · Sede {SEDE_LABELS[SF_SEDE]}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/tenis-mesa/inventario">
              <Settings className="h-4 w-4 mr-1" />
              Inventario mesas/raquetas
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tenis-mesa/acceso" target="_blank">
              <DoorOpen className="h-4 w-4 mr-1" />
              Acceso público
            </Link>
          </Button>
        </div>
      </div>

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
              <CardDescription>Elige mesa y entre 1 y 4 raquetas disponibles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tables.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No hay mesas.{" "}
                    <Link href="/tenis-mesa/inventario" className="underline font-medium">
                      Crea el inventario
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {tables.map((t) => {
                    const ocupada = mesasOcupadas.has(t.numero)
                    const selected = mesaSel === t.numero
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={ocupada}
                        onClick={() => {
                          setMesaSel(t.numero)
                          setSelectedPaddleIds(new Set())
                        }}
                        className={`rounded-lg border p-3 text-center transition ${
                          ocupada
                            ? "opacity-40 cursor-not-allowed bg-muted"
                            : selected
                              ? "border-violet-600 bg-violet-50 ring-2 ring-violet-400"
                              : "hover:border-violet-300"
                        }`}
                      >
                        <p className="font-bold">{t.numero}</p>
                        {ocupada && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Ocupada
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {mesaSel && (
                <>
                  <div className="space-y-2">
                    <Label>Raquetas disponibles (mesa {mesaSel})</Label>
                    {paddlesForMesa.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay raquetas disponibles.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {paddlesForMesa.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={selectedPaddleIds.has(p.id)}
                              onChange={() => togglePaddle(p.id)}
                              disabled={
                                !selectedPaddleIds.has(p.id) && selectedPaddleIds.size >= 4
                              }
                            />
                            <span className="text-sm">
                              Serie <strong>{p.serial}</strong>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <TableTennisUserSearch
                    id="sf-tenis-busqueda"
                    label="Usuario"
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

                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={!usuario || selectedPaddleIds.size === 0 || prestando}
                    onClick={handlePrestar}
                  >
                    <CircleDot className="h-4 w-4 mr-2" />
                    {prestando
                      ? "Registrando..."
                      : `Registrar préstamo (${selectedPaddleIds.size} raqueta(s))`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activos" className="space-y-4 mt-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
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
                  const returned = new Set(loan.returnedPaddleIds ?? [])
                  const pending = (loan.paddleIds ?? []).filter((id) => !returned.has(id))
                  return (
                    <Card
                      key={loan.id}
                      className={vencido ? "border-amber-400 bg-amber-50/30" : ""}
                    >
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Badge className="bg-violet-600">Mesa {loan.mesa}</Badge>
                          <Badge variant="outline">Series: {formatSfRaquetas(loan)}</Badge>
                          {vencido ? (
                            <Badge variant="destructive">Tiempo agotado</Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatMinutosRestantes(
                                minutosRestantes(loan.fecha, loan.horaFin),
                              )}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{loanUsuarioNombre(loan)}</p>
                        <p className="text-xs text-muted-foreground">
                          {loanUsuarioDocumento(loan)} · {loan.fecha} · {loan.horaInicio} –{" "}
                          {loan.horaFin}
                        </p>
                        {pending.length > 0 ? (
                          <div className="space-y-2">
                            {pending.map((paddleId) => {
                              const idx = (loan.paddleIds ?? []).indexOf(paddleId)
                              const serial = loan.paddleSerials?.[idx] ?? paddleId
                              return (
                                <div
                                  key={paddleId}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                                >
                                  <span className="text-sm">Serie {serial}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setReturnDialog({ loan, paddleId, serial: String(serial) })
                                    }
                                  >
                                    <Package className="h-3 w-3 mr-1" />
                                    Devolver
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-emerald-700">Todas las raquetas devueltas.</p>
                        )}
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
                Accesos del control público y préstamos con inventario dinámico
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
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
                            {entry.inventoryMode === "dynamic"
                              ? `Series: ${formatSfRaquetas(entry)}`
                              : `R${entry.raqueta1}-${entry.raqueta2}`}{" "}
                            · {entry.estado}
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
              <CardTitle>Reportes y daños</CardTitle>
              <CardDescription>
                Daños por raqueta o préstamos no devueltos a tiempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Cargando...</p>
              ) : reportes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Sin reportes.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mesa</TableHead>
                      <TableHead>Raqueta</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportes.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>Mesa {r.mesa}</TableCell>
                        <TableCell>{formatReportRaqueta(r)}</TableCell>
                        <TableCell>
                          <p className="text-sm">{r.usuarioNombre ?? r.usuario1Nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.usuarioDocumento ?? r.usuario1Documento}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>{r.fechaReporte}</p>
                          <p className="text-xs text-muted-foreground">{r.horaReporte}</p>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          {r.damageDescription ?? (
                            <>
                              Préstamo {r.fecha} {r.horaInicio}–{r.horaFin}
                            </>
                          )}
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

      <Dialog open={!!returnDialog} onOpenChange={(o) => !o && setReturnDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver raqueta {returnDialog?.serial}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Notas de daño (opcional, si reportas daño)</Label>
            <Textarea
              value={damageNote}
              onChange={(e) => setDamageNote(e.target.value)}
              placeholder="Describe el daño si aplica"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 border-emerald-300 text-emerald-700"
              disabled={returning}
              onClick={() => confirmReturn(false)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Devolver normal
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-rose-300 text-rose-700"
              disabled={returning}
              onClick={() => confirmReturn(true)}
            >
              <FileWarning className="h-4 w-4 mr-1" />
              Reportar daño
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
