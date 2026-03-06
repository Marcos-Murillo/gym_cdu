"use client"

import { usePathname } from "next/navigation"
import { Navigation } from "./navigation"

export function ConditionalNavigation() {
  const pathname = usePathname()
  
  // No mostrar navigation en la página principal
  if (pathname === "/") {
    return null
  }
  
  return <Navigation />
}
