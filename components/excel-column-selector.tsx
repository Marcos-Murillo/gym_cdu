"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Plus } from "lucide-react"

export interface ExcelColumn {
  key: string
  label: string
}

interface ExcelColumnSelectorProps {
  availableColumns: ExcelColumn[]
  onDownload: (selectedColumns: string[]) => void
  disabled?: boolean
}

export function ExcelColumnSelector({
  availableColumns,
  onDownload,
  disabled = false,
}: ExcelColumnSelectorProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(availableColumns.map((col) => col.key)),
  )

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAll = () => {
    setSelectedColumns(new Set(availableColumns.map((col) => col.key)))
  }

  const deselectAll = () => {
    setSelectedColumns(new Set())
  }

  const handleDownload = () => {
    onDownload(Array.from(selectedColumns))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Columnas adicionales</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={selectAll} className="h-7 text-xs">
            Todas
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={deselectAll} className="h-7 text-xs">
            Ninguna
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 sm:grid-cols-3">
        {availableColumns.map((column) => {
          const isSelected = selectedColumns.has(column.key)
          return (
            <button
              key={column.key}
              type="button"
              onClick={() => toggleColumn(column.key)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className="truncate">{column.label}</span>
              {isSelected ? (
                <Check className="ml-1 h-3 w-3 shrink-0" />
              ) : (
                <Plus className="ml-1 h-3 w-3 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Siempre se incluyen Nombres, Gimnasio, Piscina, Guardarropas, Tenis de mesa y Total.
      </p>

      <Button
        type="button"
        onClick={handleDownload}
        disabled={disabled}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
      >
        Descargar Excel
      </Button>
    </div>
  )
}
