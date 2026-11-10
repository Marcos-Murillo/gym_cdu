"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Bell } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { getTodayAttendance } from "@/lib/storage"

export const ATTENDANCE_REQUIRED_MESSAGE =
  "Marca tu asistencia de entrada antes de registrar entradas de usuarios."

export function useMonitorAttendanceGate() {
  const { user } = useAuth()
  const requiresAttendance = user?.rol === "monitor"
  const [loading, setLoading] = useState(requiresAttendance)
  const [blocked, setBlocked] = useState(requiresAttendance)

  const refresh = useCallback(async () => {
    if (!user || user.rol !== "monitor") {
      setLoading(false)
      setBlocked(false)
      return null
    }
    setLoading(true)
    try {
      const record = await getTodayAttendance(user.id)
      const isBlocked = !record?.horaEntrada
      setBlocked(isBlocked)
      setLoading(false)
      return isBlocked ? ATTENDANCE_REQUIRED_MESSAGE : null
    } catch {
      setBlocked(true)
      setLoading(false)
      return ATTENDANCE_REQUIRED_MESSAGE
    }
  }, [user])

  useEffect(() => {
    refresh()
    const onFocus = () => {
      refresh()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refresh])

  return { loading, blocked, refresh }
}

export function MonitorAttendanceRequiredAlert({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <Alert className="border-amber-300 bg-amber-50">
      <Bell className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        {ATTENDANCE_REQUIRED_MESSAGE}{" "}
        <Link href="/asistencia" className="font-medium underline">
          Ir a mi asistencia
        </Link>
      </AlertDescription>
    </Alert>
  )
}
