"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { getSession, clearSession, saveSession } from "./auth"
import type { SystemUser } from "./types"

interface AuthContextType {
  user: SystemUser | null
  loading: boolean
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
  refresh: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    const session = getSession()
    setUser(session)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const logout = () => {
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
