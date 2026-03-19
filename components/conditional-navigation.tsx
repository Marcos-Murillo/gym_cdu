"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "./navigation"

export function ConditionalNavigation() {
  const pathname = usePathname()

  if (pathname === "/" || pathname.startsWith("/ticket") || pathname === "/login") {
    return null
  }

  return <Navigation />
}
