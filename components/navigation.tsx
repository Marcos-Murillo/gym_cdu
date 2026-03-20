"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  DoorOpen, BarChart3, Users, Activity,
  Waves, Menu, X, Package, ShieldCheck, LogOut, UserCog, ChevronRight,
  House, ClipboardList, CalendarCheck
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getTodayAttendance } from "@/lib/storage"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { UserRole, Espacio } from "@/lib/types"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  espacio?: Espacio
}

// Sección 1: espacios operativos (monitores y encargados)
const espaciosItems: NavItem[] = [
  { href: "/gimnasio",    label: "Gimnasio",     icon: DoorOpen,  roles: ["superadmin", "admin", "monitor"], espacio: "gimnasio" },
  { href: "/piscina",     label: "Piscina",      icon: Waves,     roles: ["superadmin", "admin", "monitor"], espacio: "piscina" },
  { href: "/guardarropas",label: "Guardarropas", icon: Package,   roles: ["superadmin", "admin", "monitor"], espacio: "guardarropas" },
  { href: "/biometrico",  label: "Biométrico",   icon: Activity,  roles: ["superadmin", "admin", "monitor", "encargado"], espacio: "gimnasio" },
  { href: "/asistencia",  label: "Mi asistencia",icon: CalendarCheck, roles: ["monitor"] },
]

// Sección 2: administración (admin y superadmin)
const adminItems: NavItem[] = [
  { href: "/estadisticas",          label: "Estadísticas",       icon: BarChart3,    roles: ["superadmin", "admin", "encargado"] },
  { href: "/guardarropas/historial",label: "Historial casilleros",icon: ClipboardList,roles: ["superadmin", "admin"] },
  { href: "/asistencia/seguimiento",label: "Seguimiento asistencia",icon: CalendarCheck,roles: ["superadmin", "admin"] },
  { href: "/usuarios",              label: "Usuarios",            icon: Users,        roles: ["superadmin", "admin"] },
  { href: "/admin",                 label: "Panel Admin",         icon: UserCog,      roles: ["superadmin", "admin"] },
  { href: "/superadmin",            label: "Super Admin",         icon: ShieldCheck,  roles: ["superadmin"] },
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

function NavLink({ item, pathname, onClose }: { item: NavItem; pathname: string; onClose: () => void }) {
  const Icon = item.icon
  const isActive = pathname === item.href
  return (
    <Link
      href={item.href}
      onClick={onClose}
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
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [logoutDialog, setLogoutDialog] = useState(false)
  const [checkingSalida, setCheckingSalida] = useState(false)
  const { user, logout } = useAuth()

  if (!user) return null

  const visibleEspacios = espaciosItems.filter(i => canSeeItem(i, user.rol, user.espacio ?? undefined))
  const visibleAdmin = adminItems.filter(i => canSeeItem(i, user.rol, user.espacio ?? undefined))

  const handleLogoutClick = async () => {
    if (user.rol === "monitor") {
      // Verificar si marcó salida hoy
      setCheckingSalida(true)
      const record = await getTodayAttendance(user.id)
      setCheckingSalida(false)
      // Si entró pero no marcó salida, mostrar dialog
      if (record?.horaEntrada && !record?.horaSalida) {
        setLogoutDialog(true)
        return
      }
    }
    doLogout()
  }

  const doLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-background border-r shadow-xl flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
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
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-sm font-medium text-foreground truncate">{user.nombre}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.rol]}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

          {/* Sección espacios */}
          {visibleEspacios.length > 0 && (
            <>
              <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Espacios
              </p>
              {visibleEspacios.map(item => (
                <NavLink key={item.href} item={item} pathname={pathname} onClose={() => setIsOpen(false)} />
              ))}
            </>
          )}

          {/* Separador */}
          {visibleEspacios.length > 0 && visibleAdmin.length > 0 && (
            <div className="my-3 border-t" />
          )}

          {/* Sección administración */}
          {visibleAdmin.length > 0 && (
            <>
              <p className="px-3 pb-1 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Administración
              </p>
              {visibleAdmin.map(item => {
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
                        ? "bg-blue-100 text-blue-700"
                        : "text-blue-500/80 hover:bg-blue-50 hover:text-blue-700"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3" />}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t">
          <button
            onClick={handleLogoutClick}
            disabled={checkingSalida}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {checkingSalida ? "Verificando..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* Dialog: recordatorio salida */}
      <Dialog open={logoutDialog} onOpenChange={setLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Ya marcaste tu salida?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            No hemos registrado tu salida de hoy. Si cierras sesión sin marcarla, quedará pendiente en el historial.
          </p>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setLogoutDialog(false)
                setIsOpen(false)
                router.push("/asistencia")
              }}
            >
              No, voy a marcarla
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => { setLogoutDialog(false); doLogout() }}
            >
              Sí, cerrar sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
