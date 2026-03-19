"use client"

import { RouteGuard } from "@/components/route-guard"
import { UserManagement } from "@/components/user-management"

export default function SuperAdminPage() {
  return (
    <RouteGuard allowedRoles={["superadmin"]}>
      <UserManagement title="Panel Super Admin" />
    </RouteGuard>
  )
}
