"use client"

import { useState } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QRCodeSVG } from "qrcode.react"
import {
  Package,
  CheckCircle2,
  XCircle,
  KeyRound,
  PackageOpen,
  Info,
  Search,
  User,
} from "lucide-react"
import type { LockerRecord, UserProfile } from "@/lib/types"

export default function GuardarropasPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "monitor"]} requiredEspacioOrAdmin="guardarropas">
      <GuardarropasContent />
    </RouteGuard>
  )
}

function GuardarropasContent() {
  // Tab: depositar — paso 1: buscar usuario
  const [busqueda, setBusqueda] = useState("")
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UserProfile | null>(null)
  const [errorBusqueda, setErrorBusqueda] = useState("")
  const [buscando, setBuscando] = useState(false)

  // Tab: depositar — paso 2: asignar casillero
  const [casilleroDeposito, setCasilleroDeposito] = useState("")
  const [lockerCreado, setLockerCreado] = useState<LockerRecord | null>(null)
  const [loadingDeposito, setLoadingDeposito] = useState(false)
  const [errorDeposito, setErrorDeposito] = useState("")

  // Tab: retirar
  const [casilleroRetiro, setCasilleroRetiro] = useState("")
  const [tokenRetiro, setTokenRetiro] = useState("")
  const [loadingRetiro, setLoadingRetiro] = useState(false)
  const [errorRetiro, setErrorRetiro] = useState("")
  const [successRetiro, setSuccessRetiro] = useState(false)

  const handleBuscarUsuario = async () => {
    if (!busqueda.trim()) return
    setErrorBusqueda("")
    setUsuarioEncontrado(null)
    setBuscando(true)
    try {
      const storage = await import("@/lib/storage")
      const user = await storage.searchUserByCode(busqueda.trim())
      if (user) {
        setUsuarioEncontrado(user)
      } else {
        setErrorBusqueda("Usuario no encontrado. Verifica la cédula o código estudiantil.")
      }
    } catch (err) {
      console.error(err)
      setErrorBusqueda("Error al buscar el usuario. Intenta de nuevo.")
    }
    setBuscando(false)
  }

  const handleDepositar = async () => {
    if (!casilleroDeposito.trim() || !usuarioEncontrado) return
    setErrorDeposito("")
    setLockerCreado(null)
    setLoadingDeposito(true)
    try {
      const storage = await import("@/lib/storage")
      const activos = await storage.getActiveLockers()
      const ocupado = activos.find(l => l.casillero === casilleroDeposito.trim())
      if (ocupado) {
        setErrorDeposito(`El casillero ${casilleroDeposito} ya está ocupado.`)
        setLoadingDeposito(false)
        return
      }
      const record = await storage.createLockerRecord(casilleroDeposito.trim(), usuarioEncontrado.id)
      setLockerCreado(record)
    } catch (err) {
      console.error(err)
      setErrorDeposito("Error al registrar el casillero. Intenta de nuevo.")
    }
    setLoadingDeposito(false)
  }

  const handleNuevoDeposito = () => {
    setBusqueda("")
    setUsuarioEncontrado(null)
    setErrorBusqueda("")
    setCasilleroDeposito("")
    setLockerCreado(null)
    setErrorDeposito("")
  }

  const handleRetirar = async () => {
    if (!casilleroRetiro.trim() || !tokenRetiro.trim()) return
    setErrorRetiro("")
    setSuccessRetiro(false)
    setLoadingRetiro(true)
    try {
      const storage = await import("@/lib/storage")
      const record = await storage.validateLockerToken(casilleroRetiro.trim(), tokenRetiro.trim())
      if (!record) {
        setErrorRetiro("Token incorrecto o casillero no encontrado. No se puede entregar el bolso.")
        setLoadingRetiro(false)
        return
      }
      await storage.releaseLocker(record.id)
      setSuccessRetiro(true)
      setCasilleroRetiro("")
      setTokenRetiro("")
    } catch (err) {
      console.error(err)
      setErrorRetiro("Error al procesar el retiro. Intenta de nuevo.")
    }
    setLoadingRetiro(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Guardarropas</h1>
        <p className="text-muted-foreground">Gestión de casilleros con token de seguridad</p>
      </div>

      <Tabs defaultValue="depositar">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="depositar" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Depositar bolso
          </TabsTrigger>
          <TabsTrigger value="retirar" className="flex items-center gap-2">
            <PackageOpen className="h-4 w-4" />
            Retirar bolso
          </TabsTrigger>
        </TabsList>

        {/* ===== DEPOSITAR ===== */}
        <TabsContent value="depositar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Registrar casillero</CardTitle>
                  <CardDescription>Busca el usuario y asigna un casillero</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!lockerCreado ? (
                <>
                  {/* Paso 1: buscar usuario */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Paso 1 — Identificar usuario</p>
                    <div className="flex gap-2">
                      <Input
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setUsuarioEncontrado(null); setErrorBusqueda("") }}
                        placeholder="Cédula o código estudiantil..."
                        onKeyDown={(e) => e.key === "Enter" && handleBuscarUsuario()}
                        className="h-11"
                        disabled={!!usuarioEncontrado}
                      />
                      {!usuarioEncontrado ? (
                        <Button
                          onClick={handleBuscarUsuario}
                          disabled={!busqueda.trim() || buscando}
                          className="bg-amber-600 hover:bg-amber-700 h-11 px-4"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => { setUsuarioEncontrado(null); setBusqueda("") }}
                          className="h-11 px-4"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {errorBusqueda && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{errorBusqueda}</AlertDescription>
                      </Alert>
                    )}

                    {usuarioEncontrado && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{usuarioEncontrado.nombres}</p>
                          <p className="text-xs text-muted-foreground">
                            {usuarioEncontrado.tipoDocumento}: {usuarioEncontrado.numeroDocumento}
                            {usuarioEncontrado.codigoEstudiantil && ` · Cód: ${usuarioEncontrado.codigoEstudiantil}`}
                          </p>
                        </div>
                        <Badge className="ml-auto shrink-0 bg-amber-600 hover:bg-amber-600">Encontrado</Badge>
                      </div>
                    )}
                  </div>

                  {/* Paso 2: asignar casillero */}
                  {usuarioEncontrado && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Paso 2 — Asignar casillero</p>
                      <Alert className="bg-amber-50 border-amber-200">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          El usuario debe escanear el QR con su celular para guardar el token.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Label htmlFor="casillero-deposito">Número de casillero</Label>
                        <Input
                          id="casillero-deposito"
                          value={casilleroDeposito}
                          onChange={(e) => setCasilleroDeposito(e.target.value)}
                          placeholder="Ej: 12"
                          onKeyDown={(e) => e.key === "Enter" && handleDepositar()}
                          className="text-lg h-12"
                        />
                      </div>

                      {errorDeposito && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{errorDeposito}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        onClick={handleDepositar}
                        disabled={!casilleroDeposito.trim() || loadingDeposito}
                        className="w-full bg-amber-600 hover:bg-amber-700 h-12"
                      >
                        <KeyRound className="h-5 w-5 mr-2" />
                        {loadingDeposito ? "Generando..." : "Generar token"}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Casillero registrado</AlertTitle>
                    <AlertDescription className="text-green-700">
                      Casillero <strong>{lockerCreado.casillero}</strong> — {usuarioEncontrado?.nombres} — {lockerCreado.fechaIngreso} {lockerCreado.horaIngreso}
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50">
                    <p className="text-sm text-amber-700 font-medium">El usuario debe escanear este QR</p>
                    <QRCodeSVG
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/ticket/${encodeURIComponent(lockerCreado.casillero)}/${lockerCreado.token}`}
                      size={200}
                      bgColor="#fffbeb"
                      fgColor="#92400e"
                      level="M"
                    />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Token</p>
                      <Badge className="text-2xl font-mono px-6 py-2 bg-amber-600 hover:bg-amber-600">
                        {lockerCreado.token}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-700 text-center">
                      Guarda este token. Sin él no podrás retirar tu bolso.
                    </p>
                  </div>

                  <Button variant="outline" onClick={handleNuevoDeposito} className="w-full">
                    Registrar otro casillero
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== RETIRAR ===== */}
        <TabsContent value="retirar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <PackageOpen className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>Retirar bolso</CardTitle>
                  <CardDescription>Ingresa el casillero y el token para liberar el bolso</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-emerald-50 border-emerald-200">
                <Info className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  El usuario debe dictar su token. Si el token no coincide, no se entrega el bolso.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="casillero-retiro">Número de casillero</Label>
                  <Input
                    id="casillero-retiro"
                    value={casilleroRetiro}
                    onChange={(e) => setCasilleroRetiro(e.target.value)}
                    placeholder="Ej: 12"
                    className="text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-retiro">Token del usuario</Label>
                  <Input
                    id="token-retiro"
                    value={tokenRetiro}
                    onChange={(e) => setTokenRetiro(e.target.value.toUpperCase())}
                    placeholder="Ej: AB123"
                    maxLength={5}
                    className="text-lg h-12 font-mono tracking-widest uppercase"
                    onKeyDown={(e) => e.key === "Enter" && handleRetirar()}
                  />
                </div>
              </div>

              {errorRetiro && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Token incorrecto</AlertTitle>
                  <AlertDescription>{errorRetiro}</AlertDescription>
                </Alert>
              )}

              {successRetiro && (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-800">Bolso entregado</AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    El casillero ha sido liberado correctamente.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleRetirar}
                disabled={!casilleroRetiro.trim() || !tokenRetiro.trim() || loadingRetiro}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
              >
                <PackageOpen className="h-5 w-5 mr-2" />
                {loadingRetiro ? "Verificando..." : "Verificar y entregar"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
