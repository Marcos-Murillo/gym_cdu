"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"

interface GooeyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function GooeyInput({ value, onChange, placeholder = "Buscar...", className }: GooeyInputProps) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Foco automático cuando se abre
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!value) setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [value])

  const handleClear = () => {
    onChange("")
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn("relative h-11 flex items-center", className)}>
      {/* SVG gooey filter */}
      <svg aria-hidden="true" className="absolute w-0 h-0 overflow-hidden">
        <defs>
          <filter id="gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur" type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Blobs con filtro gooey (solo fondo, sin texto encima) */}
      <div className="absolute inset-0 flex items-center" style={{ filter: "url(#gooey-filter)" }}>
        {/* Blob principal que se expande */}
        <motion.div
          animate={{ width: open || value ? 240 : 44 }}
          initial={{ width: 44 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="h-11 rounded-full bg-neutral-100 dark:bg-neutral-800"
        />
        {/* Blob del botón ícono — siempre redondo, fusionado */}
        <div className="absolute left-0 h-11 w-11 rounded-full bg-neutral-100 dark:bg-neutral-800" />
      </div>

      {/* Ícono search — encima del filtro, clickeable */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative z-10 h-11 w-11 flex items-center justify-center shrink-0"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
      </button>

      {/* Input — encima del filtro */}
      <motion.div
        animate={{ width: open || value ? 188 : 0, opacity: open || value ? 1 : 0 }}
        initial={{ width: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="relative z-10 overflow-hidden"
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 outline-none pr-6"
        />
      </motion.div>

      {/* Botón limpiar */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="relative z-10 h-7 w-7 flex items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 shrink-0"
        >
          <X className="h-3 w-3 text-neutral-500" />
        </button>
      )}
    </div>
  )
}
