"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  DoorOpen, 
  Search, 
  CheckCircle2, 
  XCircle, 
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  Calendar
} from "lucide-react"
import { getUserByDocument, saveEntry, getEntriesByUser } from "@/lib/storage"
import type { UserProfile, EntryRecord } from "@/lib/types"

export default function EntradaPage() {
  const [codigo, setCodigo] = useState("")
  const [usuario, setUsuario] = useState<UserProfile | null>(null)
  const [entradas, setEntradas] = useState<EntryRecord[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = () => {
    setError("")
    setSuccess(false)
    setSearching(true)

    const user = getUserByDocument(codigo)
    
    if (user) {
      setUsuario(user)
      const userEntries = getEntriesByUser(user.id)
      setEntradas(userEntries)
    } else {
      setUsuario(null)
      setEntradas([])
      setError("La persona no se ha inscrito. Por favor, registrese primero en la pagina de registro.")
    }
    
    setSearching(false)
  }

  const handleRegisterEntry = () => {
    if (!usuario) return

    saveEntry(usuario.id)
    setSuccess(true)
    
    // Actualizar lista de entradas
    const userEntries = getEntriesByUser(usuario.id)
    setEntradas(userEntries)

    setTimeout(() => {
      setSuccess(false)
    }, 3000)
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
        <h1 className="text-3xl font-bold text-foreground">Registro de Entrada</h1>
        <p className="text-muted-foreground">Ingresa tu numero de documento para registrar tu entrada al gimnasio</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <DoorOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Buscar Usuario</CardTitle>
              <CardDescription>Ingresa el numero de documento del usuario</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="codigo" className="sr-only">Numero de Documento</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ingresa el numero de documento"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={!codigo || searching} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            {usuario && (
              <Button variant="outline" onClick={handleReset}>
                Limpiar
              </Button>
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
              <AlertDescription className="text-emerald-700">
                Tu entrada al gimnasio ha sido registrada exitosamente.
              </AlertDescription>
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
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                Activo
              </Badge>
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
              <Button 
                onClick={handleRegisterEntry} 
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700 px-8"
              >
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
                    <div 
                      key={entrada.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
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
