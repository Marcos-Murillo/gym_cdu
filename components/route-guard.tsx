"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import type { UserRole, Espacio } from "@/lib/types"

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  // Si se especifica, los roles monitor/encargado solo pasan si tienen este espacio.
  // superadmin y admin siempre pasan si están en allowedRoles.
  requiredEspacioOrAdmin?: Espacio
}

export function RouteGuard({ children, allowedRoles, requiredEspacioOrAdmin }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const isAllowed = () => {
    if (!user) return false
    if (allowedRoles && !allowedRoles.includes(user.rol)) return false
    if (requiredEspacioOrAdmin) {
      // superadmin y admin no necesitan espacio asignado
      if (user.rol === "superadmin" || user.rol === "admin") return true
      // monitor y encargado necesitan el espacio correcto
      if (user.espacio !== requiredEspacioOrAdmin) return false
    }
    return true
  }

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    if (!isAllowed()) {
      router.replace("/sin-acceso")
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!user || !isAllowed()) return null

  return <>{children}</>
}
