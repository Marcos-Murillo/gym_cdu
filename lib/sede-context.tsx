"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useAuth } from "./auth-context"
import { canOperateAllSedes, DEFAULT_SEDE, getStaffSede, resolveSede, type Sede } from "./sede"

const STORAGE_KEY = "cducontrol_sede_activa"

interface SedeContextType {
  sede: Sede
  setActiveSede: (sede: Sede) => void
  canSwitch: boolean
}

const SedeContext = createContext<SedeContextType>({
  sede: DEFAULT_SEDE,
  setActiveSede: () => {},
  canSwitch: false,
})

export function SedeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [sede, setSede] = useState<Sede>(DEFAULT_SEDE)
  const canSwitch = !!user && canOperateAllSedes(user.rol)

  useEffect(() => {
    if (!user) return
    if (canOperateAllSedes(user.rol)) {
      const saved = localStorage.getItem(STORAGE_KEY)
      setSede(saved ? resolveSede(saved) : getStaffSede(user))
      return
    }
    setSede(getStaffSede(user))
  }, [user])

  const setActiveSede = (next: Sede) => {
    setSede(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <SedeContext.Provider value={{ sede, setActiveSede, canSwitch }}>
      {children}
    </SedeContext.Provider>
  )
}

export function useOperatingSede() {
  return useContext(SedeContext)
}
