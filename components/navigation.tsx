"use client"

import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getTodayAttendance } from "@/lib/storage"
import { FloatingDockVertical, type DockItem } from "@/components/ui/floating-dock"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  DoorOpen, BarChart3, Users, Activity,
  Waves, Package, ShieldCheck, LogOut, UserCog,
  ClipboardList, CalendarCheck, CircleDot, Building2, ListChecks,
} from "lucide-react"
import type { UserRole, Espacio, Sede } from "@/lib/types"
import { SEDE_LABELS, SEDES_ACTIVAS } from "@/lib/sede"
import { useOperatingSede } from "@/lib/sede-context"
import { guardarropasAppliesToSede, usesFixedTableTennisInventory } from "@/lib/sede-rules"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  espacio?: Espacio
  isLogout?: boolean
}

const espaciosItems: NavItem[] = [
  { href: "/gimnasio",    label: "Gimnasio",      icon: DoorOpen,      roles: ["superadmin", "admin", "monitor"], espacio: "gimnasio" },
  { href: "/gimnasio/entradas", label: "Entradas gimnasio", icon: ListChecks, roles: ["superadmin", "admin", "monitor"] },
  { href: "/piscina",     label: "Piscina",        icon: Waves,         roles: ["superadmin", "admin", "monitor"], espacio: "piscina" },
  { href: "/guardarropas",label: "Guardarropas",   icon: Package,       roles: ["superadmin", "admin", "monitor"], espacio: "guardarropas" },
  { href: "/tenis-mesa",  label: "Tenis de mesa",  icon: CircleDot,     roles: ["superadmin", "admin", "monitor"], espacio: "tenis_mesa" },
  { href: "/biometrico",  label: "Biométrico",     icon: Activity,      roles: ["superadmin", "admin", "monitor", "encargado"], espacio: "gimnasio" },
  { href: "/asistencia",  label: "Mi asistencia",  icon: CalendarCheck, roles: ["monitor"] },
]

const adminItems: NavItem[] = [
  { href: "/tenis-mesa",               label: "Tenis de mesa",         icon: CircleDot,    roles: ["superadmin", "admin"], espacio: "tenis_mesa" },
  { href: "/estadisticas",           label: "Estadísticas",          icon: BarChart3,    roles: ["superadmin", "admin"] },
  { href: "/guardarropas/historial", label: "Historial casilleros",  icon: ClipboardList,roles: ["superadmin", "admin"] },
  { href: "/tenis-mesa/inventario", label: "Inventario tenis SF", icon: CircleDot, roles: ["superadmin", "admin", "encargado"] },
  { href: "/asistencia/seguimiento", label: "Seguimiento asistencia",icon: CalendarCheck,roles: ["superadmin", "admin"] },
  { href: "/usuarios",               label: "Usuarios",              icon: Users,        roles: ["superadmin", "admin"] },
  { href: "/admin",                  label: "Panel Admin",           icon: UserCog,      roles: ["superadmin", "admin"] },
  { href: "/superadmin",             label: "Super Admin",           icon: ShieldCheck,  roles: ["superadmin"] },
]

function canSeeItem(item: NavItem, userRole: UserRole, userEspacio?: Espacio): boolean {
  if (!item.roles.includes(userRole)) return false
  if (item.espacio) {
    if (userRole === "superadmin" || userRole === "admin") return true
    return userEspacio === item.espacio
  }
  return true
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { sede: staffSede, setActiveSede, canSwitch } = useOperatingSede()
  const [logoutDialog, setLogoutDialog] = useState(false)
  const [sedeDialog, setSedeDialog] = useState(false)
  const [checkingSalida, setCheckingSalida] = useState(false)

  if (!user) return null

  const userEspacio = user.espacio ?? undefined
  const showGuardarropas = guardarropasAppliesToSede(staffSede)

  const fixedInventory = usesFixedTableTennisInventory(staffSede)

  const visibleEspacios = espaciosItems.filter((i) => {
    if (i.href === "/guardarropas" && !showGuardarropas) return false
    if ((i.href === "/gimnasio" || i.href === "/piscina") && !fixedInventory) return false
    if (i.href === "/gimnasio/entradas" && fixedInventory) return false
    return canSeeItem(i, user.rol, userEspacio)
  })
  const visibleAdmin = adminItems.filter((i) => {
    if (i.href === "/guardarropas/historial" && !showGuardarropas) return false
    if (i.href === "/tenis-mesa/inventario" && fixedInventory) return false
    return canSeeItem(i, user.rol, userEspacio)
  })

  const handleLogoutClick = async () => {
    if (user.rol === "monitor") {
      setCheckingSalida(true)
      const record = await getTodayAttendance(user.id)
      setCheckingSalida(false)
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

  const toItems = (navItems: NavItem[]): DockItem[] =>
    navItems.map(item => ({
      title: item.label,
      href: item.href,
      icon: <item.icon className="w-full h-full" />,
      active: pathname === item.href,
    }))

  const logoutItem: DockItem = {
    title: checkingSalida ? "Verificando..." : "Cerrar sesión",
    href: "#",
    icon: <LogOut className="w-full h-full" />,
    onClick: handleLogoutClick,
    active: false,
  }

  // Separador visual entre secciones
  const separator: DockItem = {
    title: "─",
    href: "#",
    icon: <div className="w-6 h-px bg-neutral-300 dark:bg-neutral-600" />,
    active: false,
  }

  const handleSedeChange = (next: Sede) => {
    setActiveSede(next)
    setSedeDialog(false)
    if (
      next === "san_fernando" &&
      (pathname === "/gimnasio" ||
        pathname.startsWith("/piscina") ||
        pathname.startsWith("/guardarropas"))
    ) {
      router.push("/gimnasio/entradas")
    }
    if (next === "melendez" && (pathname === "/gimnasio/entradas" || pathname.startsWith("/tenis-mesa/inventario"))) {
      router.push(pathname.startsWith("/tenis-mesa") ? "/tenis-mesa" : "/gimnasio")
    }
  }

  const sedeItem: DockItem | null = canSwitch
    ? {
        title: `Sede: ${SEDE_LABELS[staffSede]}`,
        href: "#",
        icon: <Building2 className="w-full h-full" />,
        onClick: () => setSedeDialog(true),
        active: false,
      }
    : null

  const allItems: DockItem[] = [
    ...(sedeItem ? [sedeItem, separator] : []),
    ...toItems(visibleEspacios),
    ...(visibleEspacios.length > 0 && visibleAdmin.length > 0 ? [separator] : []),
    ...toItems(visibleAdmin),
    separator,
    logoutItem,
  ]

  return (
    <>
      {/* Dock vertical fijo en el lado izquierdo */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <FloatingDockVertical items={allItems} />
      </div>

      <Dialog open={sedeDialog} onOpenChange={setSedeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cambiar sede</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Estás en <strong>{SEDE_LABELS[staffSede]}</strong>. El conteo y los espacios siguen la sede activa. El informe conjunto se elige al generar el PDF en Estadísticas.
          </p>
          <div className="grid gap-2">
            {SEDES_ACTIVAS.map((s) => (
              <Button
                key={s}
                variant={staffSede === s ? "default" : "outline"}
                className={staffSede === s ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                onClick={() => handleSedeChange(s)}
              >
                {SEDE_LABELS[s]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
