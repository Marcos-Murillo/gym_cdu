"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "motion/react"

export interface FloatingNavItem {
  name: string
  icon?: React.ReactNode
}

interface FloatingNavbarProps {
  items: FloatingNavItem[]
  active: string
  onSelect: (name: string) => void
  className?: string
}

export function FloatingNavbar({ items, active, onSelect, className }: FloatingNavbarProps) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border border-neutral-200 dark:border-white/20",
          "bg-white dark:bg-black px-2 py-2",
          "shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]"
        )}
      >
        {items.map((item) => {
          const isActive = active === item.name
          return (
            <button
              key={item.name}
              onClick={() => onSelect(item.name)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200",
                isActive
                  ? "text-white dark:text-black"
                  : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              {/* Pill activo animado */}
              {isActive && (
                <motion.div
                  layoutId="floating-nav-active"
                  className="absolute inset-0 rounded-full bg-black dark:bg-white"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              {item.icon && (
                <span className="relative z-10 h-4 w-4 flex items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="relative z-10">{item.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
