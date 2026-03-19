"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Package, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { LockerRecord } from "@/lib/types"
import type { UserProfile } from "@/lib/types"

export default function TicketPage() {
  const params = useParams()
  const casillero = decodeURIComponent(params.casillero as string)
  const token = decodeURIComponent(params.token as string).toUpperCase()

  const [locker, setLocker] = useState<LockerRecord | null>(null)
  const [usuario, setUsuario] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const storage = await import("@/lib/storage")
        const record = await storage.validateLockerToken(casillero, token)
        if (!record) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setLocker(record)
        const user = await storage.getUserById(record.usuarioId)
        setUsuario(user ?? null)
      } catch (err) {
        console.error(err)
        setNotFound(true)
      }
      setLoading(false)
    }
    load()
  }, [casillero, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <p className="text-amber-700 text-sm animate-pulse">Cargando ticket...</p>
      </div>
    )
  }

  if (notFound || !locker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <Card className="max-w-sm w-full border-red-200">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
            <p className="font-semibold text-red-800">Ticket no válido</p>
            <p className="text-sm text-red-600">Este casillero no existe o ya fue liberado.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <Card className="max-w-sm w-full border-amber-300 shadow-lg">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6 text-center">

          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
            <Package className="h-8 w-8 text-amber-600" />
          </div>

          <div className="space-y-1">
            <p className="text-xl font-bold text-foreground">
              {usuario?.nombres ?? "Usuario"}
            </p>
            <p className="text-muted-foreground text-sm">
              acabas de dejar tus pertenencias en el casillero
            </p>
            <p className="text-4xl font-black text-amber-600">#{locker.casillero}</p>
          </div>

          <div className="w-full rounded-xl bg-amber-100 border border-amber-300 py-5 px-4 space-y-2">
            <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">
              Tu llave de recuperación
            </p>
            <p className="text-5xl font-mono font-black tracking-widest text-amber-800">
              {locker.token}
            </p>
          </div>

          <div className="flex items-start gap-2 bg-white border border-amber-200 rounded-lg p-3 text-left">
            <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Toma un pantallazo o guarda esta llave.
            </p>
          </div>

          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-left">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 font-medium">
              Si no la guardas, no se te podrá devolver el bolso.
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
