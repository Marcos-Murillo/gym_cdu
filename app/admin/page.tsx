"use client"

import { RouteGuard } from "@/components/route-guard"
import { UserManagement } from "@/components/user-management"

export default function AdminPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin"]}>
      <UserManagement title="Panel Admin" />
    </RouteGuard>
  )
}
