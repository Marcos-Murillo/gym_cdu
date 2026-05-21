"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface GooeyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Búsqueda de texto libre (cédula, código, nombre) — sin animación que corte el teclado. */
export function GooeyInput({ value, onChange, placeholder = "Buscar...", className }: GooeyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("")
            inputRef.current?.focus()
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  )
}
