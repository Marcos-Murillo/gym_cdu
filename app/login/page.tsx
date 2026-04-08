"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dumbbell, LogIn } from "lucide-react"
import { loginSystemUser, saveSession, ensureSuperAdmin } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import type { SystemUser } from "@/lib/types"

function getRedirectPath(user: SystemUser): string {
  if (user.rol === "superadmin") return "/superadmin"
  if (user.rol === "admin") return "/usuarios"
  if (user.rol === "encargado") return "/estadisticas"
  if (user.rol === "monitor") {
    if (user.espacio === "gimnasio") return "/gimnasio"
    if (user.espacio === "guardarropas") return "/guardarropas"
    if (user.espacio === "piscina") return "/piscina"
  }
  return "/sin-acceso"
}

export default function LoginPage() {
  const [cedula, setCedula] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, refresh } = useAuth()

  useEffect(() => {
    ensureSuperAdmin().catch(() => {
      // Si falla (ej: permisos Firestore), no bloquear el login
    })
  }, [])

  useEffect(() => {
    if (user) {
      router.replace(getRedirectPath(user))
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await loginSystemUser(cedula.trim(), password)
      if (!result) {
        setError("Cédula o contraseña incorrectos.")
      } else {
        saveSession(result)
        refresh()
        // Si es monitor, redirigir a asistencia con aviso
        if (result.rol === "monitor") {
          router.replace("/asistencia?nuevo=1")
        } else {
          router.replace(getRedirectPath(result))
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
        setError("Error de permisos en la base de datos. Contacta al administrador.")
      } else {
        setError(`Error al iniciar sesión: ${msg}`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 sm:h-12 sm:w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Dumbbell className="h-8 w-8 sm:h-7 sm:w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl sm:text-2xl">GymControl</CardTitle>
          <CardDescription className="text-base sm:text-sm">Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cedula" className="text-base sm:text-sm">Cédula</Label>
              <Input
                id="cedula"
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                placeholder="Número de cédula"
                className="h-12 sm:h-10 text-base sm:text-sm"
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base sm:text-sm">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="h-12 sm:h-10 text-base sm:text-sm"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full h-12 sm:h-10 text-base sm:text-sm bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              <LogIn className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
