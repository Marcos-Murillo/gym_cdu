"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  DoorOpen, BarChart3, Users, Activity,
  Dumbbell, Waves, Menu, X, Package, ShieldCheck, LogOut, UserCog, ChevronRight,
  House
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import type { UserRole, Espacio } from "@/lib/types"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  espacio?: Espacio
}

const navItems: NavItem[] = [
  { href: "/superadmin", label: "Super Admin", icon: ShieldCheck, roles: ["superadmin"] },
  { href: "/admin", label: "Admin", icon: UserCog, roles: ["superadmin", "admin"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["superadmin", "admin"] },
  { href: "/gimnasio", label: "Gimnasio", icon: DoorOpen, roles: ["superadmin", "admin", "monitor"], espacio: "gimnasio" },
  { href: "/piscina", label: "Piscina", icon: Waves, roles: ["superadmin", "admin", "monitor"], espacio: "piscina" },
  { href: "/guardarropas", label: "Guardarropas", icon: Package, roles: ["superadmin", "admin", "monitor"], espacio: "guardarropas" },
  { href: "/estadisticas", label: "Estadisticas", icon: BarChart3, roles: ["superadmin", "admin", "encargado"] },
  { href: "/biometrico", label: "Biometrico", icon: Activity, roles: ["superadmin", "admin", "monitor", "encargado"], espacio: "gimnasio" },
]

function canSeeItem(item: NavItem, userRole: UserRole, userEspacio?: Espacio): boolean {
  if (!item.roles.includes(userRole)) return false
  if (item.espacio) {
    if (userRole === "superadmin" || userRole === "admin") return true
    return userEspacio === item.espacio
  }
  return true
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  monitor: "Monitor",
  encargado: "Encargado",
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()

  if (!user) return null

  const visibleItems = navItems.filter(item => canSeeItem(item, user.rol, user.espacio ?? undefined))

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {/* Toggle button — siempre visible */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-background border-r shadow-xl flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <House className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-foreground">CDUControl</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-sm font-medium text-foreground truncate">{user.nombre}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.rol]}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
