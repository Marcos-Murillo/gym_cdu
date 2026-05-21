"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, CircleDot, Table2, UserPlus } from "lucide-react"
import { TOTAL_MESAS } from "@/lib/table-tennis-utils"
import { createTableTennisAccess } from "@/lib/table-tennis-storage"
import type { UserProfile } from "@/lib/types"

export default function TenisMesaAccesoPage() {
  const [busqueda, setBusqueda] = useState("")
  const [mesa, setMesa] = useState("")
  const [usuario, setUsuario] = useState<UserProfile | null>(null)
  const [error, setError] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleBuscar = async () => {
    if (!busqueda.trim()) return
    setError("")
    setUsuario(null)
    setSuccess(false)
    setBuscando(true)
    try {
      const storage = await import("@/lib/storage")
      const found = await storage.searchUserByCode(busqueda.trim())
      if (!found) {
        setError("No estás registrado en el sistema. Regístrate primero en la página principal.")
      } else {
        setUsuario(found)
      }
    } catch {
      setError("Error al buscar. Intenta de nuevo.")
    }
    setBuscando(false)
  }

  const handleRegistrarAcceso = async () => {
    const mesaNum = parseInt(mesa, 10)
    if (!usuario || !mesa) {
      setError("Selecciona la mesa en la que vas a jugar.")
      return
    }
    setError("")
    setRegistrando(true)
    try {
      await createTableTennisAccess(usuario, mesaNum)
      setSuccess(true)
      setBusqueda("")
      setMesa("")
      setUsuario(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el acceso.")
    }
    setRegistrando(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-foreground">Control de acceso</h1>
        <p className="text-muted-foreground">Tenis de mesa · CDU GymControl</p>
      </div>

      <Card className="border-violet-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-violet-700">
            <CircleDot className="h-5 w-5" />
            Ingreso a jugar
          </CardTitle>
          <CardDescription>
            Ingresa tu cédula o código estudiantil y el número de mesa que vas a usar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="acceso-busqueda">Cédula o código estudiantil</Label>
            <div className="flex gap-2">
              <Input
                id="acceso-busqueda"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setError("")
                  setSuccess(false)
                }}
                placeholder="Documento o código"
                disabled={!!usuario}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
                className="h-11"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 shrink-0"
                disabled={!busqueda.trim() || buscando}
                onClick={handleBuscar}
              >
                {buscando ? "..." : "Buscar"}
              </Button>
            </div>
          </div>

          {usuario && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-medium">{usuario.nombres}</p>
              <p className="text-emerald-700">{usuario.numeroDocumento}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="acceso-mesa" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Mesa a utilizar
            </Label>
            <Select
              value={mesa || undefined}
              onValueChange={(v) => {
                setMesa(v)
                setError("")
                setSuccess(false)
              }}
              disabled={!usuario}
            >
              <SelectTrigger id="acceso-mesa" className="h-11 text-base">
                <SelectValue placeholder="Selecciona una mesa (1 a 8)" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: TOTAL_MESAS }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    Mesa {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-300 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Acceso registrado correctamente. ¡Buen juego!
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full bg-violet-600 hover:bg-violet-700 h-11"
            disabled={!usuario || !mesa || registrando}
            onClick={handleRegistrarAcceso}
          >
            {registrando ? "Registrando..." : "Registrar acceso"}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-violet-600 hover:underline"
            >
              <UserPlus className="h-4 w-4" />
              ¿No estás registrado? Crear cuenta aquí
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        El préstamo de raquetas lo realiza el personal en el módulo de administración.
      </p>
    </div>
  )
}
