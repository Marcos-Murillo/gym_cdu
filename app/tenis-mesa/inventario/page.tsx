"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RouteGuard } from "@/components/route-guard"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CircleDot, Plus, Trash2 } from "lucide-react"
import {
  createSfPaddle,
  createSfTable,
  deleteSfPaddle,
  getSfPaddles,
  getSfTables,
} from "@/lib/sf-table-tennis-inventory"
import type { SfTableTennisPaddle, SfTableTennisTable } from "@/lib/types"
import { isSanFernandoStaff } from "@/lib/sede-rules"
import { useRouter } from "next/navigation"

export default function TenisMesaInventarioPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "encargado"]}>
      <InventarioContent />
    </RouteGuard>
  )
}

function InventarioContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [tables, setTables] = useState<SfTableTennisTable[]>([])
  const [paddles, setPaddles] = useState<SfTableTennisPaddle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mesaNum, setMesaNum] = useState("")
  const [tableId, setTableId] = useState("")
  const [serial, setSerial] = useState("")

  const canManage = user && (user.rol === "superadmin" || user.rol === "admin" || isSanFernandoStaff(user))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, p] = await Promise.all([getSfTables(), getSfPaddles()])
      setTables(t)
      setPaddles(p)
    } catch {
      setError("Error al cargar inventario")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user && !canManage) {
      router.replace("/tenis-mesa")
      return
    }
    load()
  }, [user, canManage, load, router])

  const handleAddTable = async () => {
    setError("")
    const n = parseInt(mesaNum, 10)
    if (!n || n < 1) {
      setError("Indica un número de mesa válido")
      return
    }
    try {
      await createSfTable(n)
      setMesaNum("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la mesa")
    }
  }

  const handleAddPaddle = async () => {
    setError("")
    if (!tableId || !serial.trim()) {
      setError("Selecciona mesa e indica el número de serie")
      return
    }
    try {
      await createSfPaddle(tableId, serial)
      setSerial("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la raqueta")
    }
  }

  const handleDeletePaddle = async (id: string) => {
    setError("")
    try {
      await deleteSfPaddle(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar")
    }
  }

  if (!canManage) return null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tenis-mesa">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Inventario tenis · San Fernando</h1>
          <p className="text-sm text-muted-foreground">Mesas y raquetas (máx. 4 por mesa)</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva mesa
          </CardTitle>
          <CardDescription>Solo el número de mesa</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="number"
            min={1}
            placeholder="Número de mesa"
            value={mesaNum}
            onChange={(e) => setMesaNum(e.target.value)}
          />
          <Button onClick={handleAddTable} className="bg-violet-600 hover:bg-violet-700 shrink-0">
            Agregar mesa
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5" />
            Nueva raqueta
          </CardTitle>
          <CardDescription>Número de serie único</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Mesa</Label>
            <Select value={tableId || undefined} onValueChange={setTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona mesa" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Mesa {t.numero}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Número de serie"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
            <Button onClick={handleAddPaddle} className="bg-violet-600 hover:bg-violet-700 shrink-0">
              Agregar raqueta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventario actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : tables.length === 0 ? (
            <p className="text-muted-foreground">No hay mesas registradas.</p>
          ) : (
            tables.map((t) => {
              const tablePaddles = paddles.filter((p) => p.tableId === t.id)
              return (
                <div key={t.id} className="rounded-lg border p-4 space-y-2">
                  <p className="font-semibold">Mesa {t.numero}</p>
                  {tablePaddles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin raquetas</p>
                  ) : (
                    <ul className="space-y-1">
                      {tablePaddles.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-center justify-between text-sm gap-2"
                        >
                          <span>
                            Serie <strong>{p.serial}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                p.estado === "disponible"
                                  ? "secondary"
                                  : p.estado === "prestada"
                                    ? "default"
                                    : "destructive"
                              }
                            >
                              {p.estado}
                            </Badge>
                            {p.estado === "disponible" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeletePaddle(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
