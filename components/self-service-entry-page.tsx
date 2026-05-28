"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, DoorOpen, UserPlus, Waves } from "lucide-react"
import { SF_SEDE } from "@/lib/sede-rules"
import { SEDE_LABELS } from "@/lib/sede"
import type { UserProfile } from "@/lib/types"

type Instalacion = "gimnasio" | "piscina"

const CONFIG: Record<
  Instalacion,
  { title: string; subtitle: string; icon: typeof DoorOpen; buttonClass: string; borderClass: string }
> = {
  gimnasio: {
    title: "Ingreso al gimnasio",
    subtitle: "San Fernando · CDUControl",
    icon: DoorOpen,
    buttonClass: "bg-emerald-600 hover:bg-emerald-700",
    borderClass: "border-emerald-200",
  },
  piscina: {
    title: "Ingreso a piscina",
    subtitle: "San Fernando · CDUControl",
    icon: Waves,
    buttonClass: "bg-cyan-600 hover:bg-cyan-700",
    borderClass: "border-cyan-200",
  },
}

export function SelfServiceEntryPage({ instalacion }: { instalacion: Instalacion }) {
  const cfg = CONFIG[instalacion]
  const Icon = cfg.icon

  const [busqueda, setBusqueda] = useState("")
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
        setError("No estás registrado. Regístrate primero en la página principal.")
      } else {
        setUsuario(found)
      }
    } catch {
      setError("Error al buscar. Intenta de nuevo.")
    }
    setBuscando(false)
  }

  const handleRegistrar = async () => {
    if (!usuario) return
    setError("")
    setRegistrando(true)
    try {
      const storage = await import("@/lib/storage")
      await storage.saveEntry(usuario.id, instalacion, SF_SEDE)
      setSuccess(true)
      setBusqueda("")
      setUsuario(null)
    } catch {
      setError("No se pudo registrar la entrada. Intenta de nuevo.")
    }
    setRegistrando(false)
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-foreground">{cfg.title}</h1>
        <p className="text-muted-foreground">{cfg.subtitle}</p>
        <p className="text-sm text-muted-foreground">Sede {SEDE_LABELS[SF_SEDE]}</p>
      </div>

      <Card className={cfg.borderClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Registro de entrada
          </CardTitle>
          <CardDescription>Ingresa tu cédula o código estudiantil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="busqueda">Cédula o código estudiantil</Label>
            <div className="flex gap-2">
              <Input
                id="busqueda"
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
              <p className="font-medium">{usuario.nombres.toUpperCase()}</p>
              <p className="text-emerald-700">{usuario.numeroDocumento}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-300 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Entrada registrada en {SEDE_LABELS[SF_SEDE]}. ¡Buen entrenamiento!
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className={`w-full h-11 ${cfg.buttonClass}`}
            disabled={!usuario || registrando}
            onClick={handleRegistrar}
          >
            {registrando ? "Registrando..." : "Registrar entrada"}
          </Button>

          <div className="pt-2 text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <UserPlus className="h-4 w-4" />
              ¿No estás registrado? Crear cuenta aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
