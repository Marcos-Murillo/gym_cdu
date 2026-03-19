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
    ensureSuperAdmin()
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
        router.replace(getRedirectPath(result))
      }
    } catch {
      setError("Error al iniciar sesión. Intenta de nuevo.")
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">GymControl</CardTitle>
          <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cedula">Cédula</Label>
              <Input
                id="cedula"
                value={cedula}
                onChange={e => setCedula(e.target.value)}
                placeholder="Número de cédula"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
