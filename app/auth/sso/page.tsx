"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { saveSession } from "@/lib/auth"
import { useAuth } from "@/lib/auth-context"
import type { SystemUser } from "@/lib/types"

function SSOHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useAuth()
  const [error, setError] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setError("Token no proporcionado.")
      return
    }

    fetch("/api/auth/verify-sso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          return
        }

        // Build a SystemUser compatible object and save to localStorage
        const user: SystemUser = {
          id: data.uid,
          nombre: data.nombre,
          cedula: data.cedula,
          passwordHash: "",
          rol: data.rol,
          espacio: data.espacio ?? undefined,
          creadoPor: "sso",
          fechaCreacion: new Date().toISOString(),
          activo: true,
        }

        saveSession(user)
        refresh()

        const redirect = searchParams.get("redirect") ?? getDefaultRedirect(user)
        router.replace(redirect)
      })
      .catch(() => setError("Error al verificar el acceso."))
  }, [searchParams, refresh, router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-red-600 text-base">{error}</p>
        <a href="/login" className="text-blue-600 underline text-sm">Ir al login</a>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Iniciando sesión...</p>
    </div>
  )
}

function getDefaultRedirect(user: SystemUser): string {
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

export default function SSOPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    }>
      <SSOHandler />
    </Suspense>
  )
}
