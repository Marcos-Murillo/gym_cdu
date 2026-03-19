"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  DoorOpen, Search, CheckCircle2, XCircle, User,
  Mail, Phone, GraduationCap, Building2, Calendar, Info
} from "lucide-react"
import type { UserProfile, EntryRecord } from "@/lib/types"

export default function GimnasioContent() {
  const [codigo, setCodigo] = useState("")
  const [usuario, setUsuario] = useState<UserProfile | null>(null)
  const [entradas, setEntradas] = useState<EntryRecord[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = async () => {
    setError("")
    setSuccess(false)
    setSearching(true)
    try {
      const storage = await import("@/lib/storage")
      const user = await storage.searchUserByCode(codigo)
      if (user) {
        setUsuario(user)
        const userEntries = await storage.getEntriesByUser(user.id)
        setEntradas(userEntries)
      } else {
        setUsuario(null)
        setEntradas([])
        setError("La persona no se ha inscrito. Por favor, registrese primero en la pagina de registro.")
      }
    } catch {
      setError("Error al buscar el usuario. Por favor intenta de nuevo.")
    }
    setSearching(false)
  }

  const handleRegisterEntry = async () => {
    if (!usuario) return
    const storage = await import("@/lib/storage")
    await storage.saveEntry(usuario.id, "gimnasio")
    setSuccess(true)
    const userEntries = await storage.getEntriesByUser(usuario.id)
    setEntradas(userEntries)
    setTimeout(() => setSuccess(false), 3000)
  }

  const handleReset = () => {
    setCodigo("")
    setUsuario(null)
    setEntradas([])
    setError("")
    setSuccess(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Registro de Entrada - Gimnasio</h1>
        <p className="text-muted-foreground">Busca por documento, nombre o codigo estudiantil para registrar la entrada</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DoorOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Buscar Usuario</CardTitle>
              <CardDescription>Ingresa el documento, nombre o codigo estudiantil</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Puedes buscar por numero de documento, nombre completo o codigo estudiantil
            </AlertDescription>
          </Alert>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="codigo" className="sr-only">Buscar Usuario</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Documento, nombre o codigo estudiantil..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="text-lg h-12"
              />
            </div>
            <Button onClick={handleSearch} disabled={!codigo || searching} className="bg-blue-600 hover:bg-blue-700 h-12 px-6">
              <Search className="h-5 w-5 mr-2" />
              Buscar
            </Button>
            {usuario && (
              <Button variant="outline" onClick={handleReset} className="h-12">Limpiar</Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Usuario no encontrado</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-800">Entrada Registrada</AlertTitle>
              <AlertDescription className="text-emerald-700">Entrada al gimnasio registrada exitosamente.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {usuario && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">{usuario.nombres}</CardTitle>
                  <CardDescription>Usuario registrado</CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Activo</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Correo</p>
                  <p className="font-medium">{usuario.correo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">{usuario.telefono}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Estamento</p>
                  <p className="font-medium">{usuario.estamento}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Facultad</p>
                  <p className="font-medium">{usuario.facultad}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button onClick={handleRegisterEntry} size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-8">
                <DoorOpen className="h-5 w-5 mr-2" />
                Registrar Entrada
              </Button>
            </div>
            {entradas.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ultimas Entradas
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {entradas.slice(-10).reverse().map((entrada) => (
                    <div key={entrada.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="text-sm">{entrada.fecha}</span>
                      <Badge variant="outline">{entrada.hora}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
