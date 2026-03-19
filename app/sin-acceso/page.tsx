"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShieldOff } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function SinAccesoPage() {
  const router = useRouter()
  const { user } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
        <ShieldOff className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold">Sin acceso</h1>
      <p className="text-muted-foreground max-w-sm">
        No tienes permisos para ver esta página.
      </p>
      <Button variant="outline" onClick={() => router.back()}>
        Volver
      </Button>
      {!user && (
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push("/login")}>
          Ir al login
        </Button>
      )}
    </div>
  )
}
