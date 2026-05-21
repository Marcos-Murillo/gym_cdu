"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, User, XCircle } from "lucide-react"
import type { UserProfile } from "@/lib/types"

export type TableTennisUserSearchProps = {
  id: string
  label: string
  busqueda: string
  onBusquedaChange: (value: string) => void
  usuario: UserProfile | null
  onClearUsuario: () => void
  error: string
  onClearError: () => void
  buscando: boolean
  onSearch: () => void
}

/** Búsqueda por cédula o código (texto libre, sin límite a un dígito). */
export function TableTennisUserSearch({
  id,
  label,
  busqueda,
  onBusquedaChange,
  usuario,
  onClearUsuario,
  error,
  onClearError,
  buscando,
  onSearch,
}: TableTennisUserSearchProps) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <Input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={busqueda}
          onChange={(e) => {
            onBusquedaChange(e.target.value)
            onClearError()
          }}
          placeholder="Cédula o código estudiantil"
          disabled={!!usuario}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="h-11 text-base"
        />
        {!usuario ? (
          <Button
            type="button"
            onClick={onSearch}
            disabled={!busqueda.trim() || buscando}
            variant="secondary"
            className="h-11 px-4 shrink-0"
          >
            <Search className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-4 shrink-0"
            onClick={onClearUsuario}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {usuario && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded">
          <User className="h-4 w-4 shrink-0" />
          <span>
            {usuario.nombres} — {usuario.numeroDocumento}
            {usuario.codigoEstudiantil ? ` · ${usuario.codigoEstudiantil}` : ""}
          </span>
        </div>
      )}
    </div>
  )
}
