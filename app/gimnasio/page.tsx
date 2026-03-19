"use client"

import { RouteGuard } from "@/components/route-guard"
import GimnasioContent from "@/components/gimnasio-content"

export default function GimnasioPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "monitor"]} requiredEspacioOrAdmin="gimnasio">
      <GimnasioContent />
    </RouteGuard>
  )
}
