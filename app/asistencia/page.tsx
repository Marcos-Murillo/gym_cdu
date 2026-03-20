"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, LogIn, LogOut, CheckCircle2, CalendarDays, Timer, Bell } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getTodayAttendance, registerAttendanceEntry, registerAttendanceExit } from "@/lib/storage"
import type { AttendanceRecord } from "@/lib/types"

export default function AsistenciaPage() {
  return (
    <RouteGuard allowedRoles={["monitor"]}>
      <Suspense>
        <AsistenciaContent />
      </Suspense>
    </RouteGuard>
  )
}

function AsistenciaContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const isNew = searchParams.get("nuevo") === "1"

  const [record, setRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [now, setNow] = useState(new Date())
  const [showBanner, setShowBanner] = useState(isNew)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const load = async () => {
    if (!user) return
    setLoading(true)
    const r = await getTodayAttendance(user.id)
    setRecord(r)
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const handleEntrada = async () => {
    if (!user) return
    setSaving(true)
    const r = await registerAttendanceEntry(user.id, user.nombre, user.espacio ?? "sin espacio")
    setRecord(r)
    setShowBanner(false)
    setSaving(false)
  }

  const handleSalida = async () => {
    if (!record) return
    setSaving(true)
    await registerAttendanceExit(record.id)
    await load()
    setSaving(false)
  }

  const today = now.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const timeStr = now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const yaEntro = !!record?.horaEntrada
  const yaSalio = !!record?.horaSalida

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Mi Asistencia</h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      {/* Banner recordatorio al entrar */}
      {showBanner && !yaEntro && (
        <Alert className="border-amber-300 bg-amber-50">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 font-medium">
            Recuerda marcar tu asistencia de entrada antes de comenzar tu turno.
          </AlertDescription>
        </Alert>
      )}

      {/* Reloj */}
      <Card className="text-center">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-center gap-2 text-4xl font-mono font-bold text-emerald-600">
            <Clock className="h-8 w-8" />
            {timeStr}
          </div>
        </CardContent>
      </Card>

      {/* Estado del día */}
      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Cargando...</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Registro de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Entrada</p>
                {yaEntro
                  ? <p className="font-mono font-bold text-emerald-600">{record!.horaEntrada}</p>
                  : <p className="text-muted-foreground text-sm">—</p>
                }
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">Salida</p>
                {yaSalio
                  ? <p className="font-mono font-bold text-blue-600">{record!.horaSalida}</p>
                  : <p className="text-muted-foreground text-sm">—</p>
                }
              </div>
            </div>

            {yaSalio && record?.duracionMinutos !== undefined && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <Timer className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Tiempo trabajado: {Math.floor(record.duracionMinutos / 60)}h {record.duracionMinutos % 60}min
                </span>
              </div>
            )}

            {!yaEntro && (
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-base" onClick={handleEntrada} disabled={saving}>
                <LogIn className="h-5 w-5 mr-2" />
                {saving ? "Registrando..." : "Marcar entrada"}
              </Button>
            )}

            {yaEntro && !yaSalio && (
              <Button className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-base" onClick={handleSalida} disabled={saving}>
                <LogOut className="h-5 w-5 mr-2" />
                {saving ? "Registrando..." : "Marcar salida"}
              </Button>
            )}

            {yaSalio && (
              <Alert className="border-emerald-200 bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-700">
                  Asistencia completa registrada para hoy.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline">{user?.espacio ?? "sin espacio"}</Badge>
              <Badge variant="outline">{user?.nombre}</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
