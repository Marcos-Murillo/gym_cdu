"use client"

import { useState, useEffect } from "react"
import { RouteGuard } from "@/components/route-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { FloatingNavbar } from "@/components/ui/floating-navbar"
import { GooeyInput } from "@/components/ui/gooey-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Activity, Search, User, Save, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Minus, Scale, Ruler, Heart,
  Percent, Pencil, RefreshCw, Plus, List, BarChart2
} from "lucide-react"
import {
  getUserByDocument, saveBiometricData, getBiometricByUser,
  getUsers, getBiometricData, updateBiometricData
} from "@/lib/storage"
import type { UserProfile, BiometricData } from "@/lib/types"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts"

export default function BiometricoPage() {
  return (
    <RouteGuard allowedRoles={["superadmin", "admin", "monitor", "encargado"]} requiredEspacioOrAdmin="gimnasio">
      <BiometricoContent />
    </RouteGuard>
  )
}

function BiometricoContent() {
  // Datos globales
  const [allRecords, setAllRecords] = useState<BiometricData[]>([])
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("Registros")

  // Dialog nuevo registro
  const [newDialog, setNewDialog] = useState(false)
  const [docSearch, setDocSearch] = useState("")
  const [docUser, setDocUser] = useState<UserProfile | null>(null)
  const [docError, setDocError] = useState("")
  const [newForm, setNewForm] = useState({
    altura: "", peso: "", grasaCorporal: "", masaMuscular: "",
    circunferenciaCintura: "", circunferenciaCadera: "", frecuenciaCardiacaReposo: "", notas: "",
  })
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Dialog editar / segundo test
  const [editDialog, setEditDialog] = useState<{ open: boolean; record: BiometricData | null; mode: "edit" | "secondTest" }>({
    open: false, record: null, mode: "edit",
  })
  const [editForm, setEditForm] = useState({
    altura: "", peso: "", grasaCorporal: "", masaMuscular: "",
    circunferenciaCintura: "", circunferenciaCadera: "", frecuenciaCardiacaReposo: "", notas: "",
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [records, users] = await Promise.all([getBiometricData(), getUsers()])
    setAllRecords(records.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()))
    setAllUsers(users)
    setLoading(false)
  }

  const getUserName = (id: string) => allUsers.find(u => u.id === id)?.nombres ?? id

  const calculateIMC = (peso: number, altura: number) => Number((peso / Math.pow(altura / 100, 2)).toFixed(2))

  const getIMCCategory = (imc: number): { label: string; color: string } => {
    if (imc < 18.5) return { label: "Bajo peso", color: "text-blue-600" }
    if (imc < 25) return { label: "Normal", color: "text-emerald-600" }
    if (imc < 30) return { label: "Sobrepeso", color: "text-amber-600" }
    return { label: "Obesidad", color: "text-red-600" }
  }

  const getTrend = (cur: number, prev: number) => cur > prev ? "up" : cur < prev ? "down" : "same"

  // Estadísticas generales
  const avgIMC = allRecords.length ? (allRecords.reduce((s, r) => s + r.imc, 0) / allRecords.length).toFixed(2) : "—"
  const avgPeso = allRecords.length ? (allRecords.reduce((s, r) => s + r.peso, 0) / allRecords.length).toFixed(1) : "—"
  const avgGrasa = allRecords.filter(r => r.grasaCorporal > 0).length
    ? (allRecords.filter(r => r.grasaCorporal > 0).reduce((s, r) => s + r.grasaCorporal, 0) / allRecords.filter(r => r.grasaCorporal > 0).length).toFixed(1)
    : "—"
  const avgMusculo = allRecords.filter(r => r.masaMuscular > 0).length
    ? (allRecords.filter(r => r.masaMuscular > 0).reduce((s, r) => s + r.masaMuscular, 0) / allRecords.filter(r => r.masaMuscular > 0).length).toFixed(1)
    : "—"

  // Datos para gráfico global (últimos 30 registros cronológicos)
  const chartData = [...allRecords].reverse().slice(-30).map(r => ({
    fecha: new Date(r.fecha).toLocaleDateString(),
    imc: r.imc,
    peso: r.peso,
  }))

  // Filtro de registros
  const filtered = allRecords.filter(r => {
    if (!search) return true
    const term = search.toLowerCase()
    const user = allUsers.find(u => u.id === r.usuarioId)
    if (!user) return false
    return (
      user.nombres?.toLowerCase().includes(term) ||
      user.numeroDocumento?.toLowerCase().includes(term) ||
      user.codigoEstudiantil?.toLowerCase().includes(term)
    )
  })

  // Buscar usuario por documento en dialog nuevo registro
  const handleDocSearch = async () => {
    setDocError("")
    setDocUser(null)
    const u = await getUserByDocument(docSearch)
    if (u) setDocUser(u)
    else setDocError("Usuario no encontrado")
  }

  const resetNewForm = () => {
    setNewForm({ altura: "", peso: "", grasaCorporal: "", masaMuscular: "", circunferenciaCintura: "", circunferenciaCadera: "", frecuenciaCardiacaReposo: "", notas: "" })
    setDocSearch(""); setDocUser(null); setDocError("")
  }

  const handleNewSave = async () => {
    if (!docUser || !newForm.altura || !newForm.peso) return
    const altura = parseFloat(newForm.altura)
    const peso = parseFloat(newForm.peso)
    await saveBiometricData({
      usuarioId: docUser.id, altura, peso,
      imc: calculateIMC(peso, altura),
      grasaCorporal: newForm.grasaCorporal ? parseFloat(newForm.grasaCorporal) : 0,
      masaMuscular: newForm.masaMuscular ? parseFloat(newForm.masaMuscular) : 0,
      circunferenciaCintura: newForm.circunferenciaCintura ? parseFloat(newForm.circunferenciaCintura) : 0,
      circunferenciaCadera: newForm.circunferenciaCadera ? parseFloat(newForm.circunferenciaCadera) : 0,
      frecuenciaCardiacaReposo: newForm.frecuenciaCardiacaReposo ? parseInt(newForm.frecuenciaCardiacaReposo) : 0,
      notas: newForm.notas,
    })
    setSaveSuccess(true)
    setTimeout(() => { setSaveSuccess(false); setNewDialog(false); resetNewForm(); loadData() }, 1500)
  }

  const openEdit = (record: BiometricData) => {
    setEditForm({
      altura: String(record.altura), peso: String(record.peso),
      grasaCorporal: String(record.grasaCorporal || ""), masaMuscular: String(record.masaMuscular || ""),
      circunferenciaCintura: String(record.circunferenciaCintura || ""),
      circunferenciaCadera: String(record.circunferenciaCadera || ""),
      frecuenciaCardiacaReposo: String(record.frecuenciaCardiacaReposo || ""),
      notas: record.notas || "",
    })
    setEditDialog({ open: true, record, mode: "edit" })
  }

  const openSecondTest = (record: BiometricData) => {
    setEditForm({ altura: String(record.altura), peso: "", grasaCorporal: "", masaMuscular: "", circunferenciaCintura: "", circunferenciaCadera: "", frecuenciaCardiacaReposo: "", notas: "" })
    setEditDialog({ open: true, record, mode: "secondTest" })
  }

  const handleEditSave = async () => {
    if (!editDialog.record) return
    const altura = parseFloat(editForm.altura)
    const peso = parseFloat(editForm.peso)
    const imc = calculateIMC(peso, altura)
    const payload = {
      altura, peso, imc,
      grasaCorporal: editForm.grasaCorporal ? parseFloat(editForm.grasaCorporal) : 0,
      masaMuscular: editForm.masaMuscular ? parseFloat(editForm.masaMuscular) : 0,
      circunferenciaCintura: editForm.circunferenciaCintura ? parseFloat(editForm.circunferenciaCintura) : 0,
      circunferenciaCadera: editForm.circunferenciaCadera ? parseFloat(editForm.circunferenciaCadera) : 0,
      frecuenciaCardiacaReposo: editForm.frecuenciaCardiacaReposo ? parseInt(editForm.frecuenciaCardiacaReposo) : 0,
      notas: editForm.notas,
    }
    if (editDialog.mode === "edit") {
      await updateBiometricData(editDialog.record.id, payload)
    } else {
      await saveBiometricData({ usuarioId: editDialog.record.usuarioId, ...payload })
    }
    setEditDialog({ open: false, record: null, mode: "edit" })
    loadData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <GooeyInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar usuario..."
          />
        </div>
        <Button onClick={() => { resetNewForm(); setNewDialog(true) }} className="bg-purple-600 hover:bg-purple-700 shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Registro
        </Button>
      </div>

      {/* Tabs principales */}
      <FloatingNavbar
        items={[
          { name: "Registros", icon: <List className="h-4 w-4" /> },
          { name: "Estadísticas", icon: <BarChart2 className="h-4 w-4" /> },
        ]}
        active={activeTab}
        onSelect={setActiveTab}
      />

      {/* Contenido: Todos los Registros */}
      {activeTab === "Registros" && (
        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Cargando registros...</div>
            ) : filtered.length > 0 ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Altura (cm)</TableHead>
                      <TableHead>IMC</TableHead>
                      <TableHead>Grasa (%)</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(record => {
                      const imcCat = getIMCCategory(record.imc)
                      return (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{getUserName(record.usuarioId)}</TableCell>
                          <TableCell>
                            {new Date(record.fecha).toLocaleDateString()}{" "}
                            {new Date(record.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell>{record.peso}</TableCell>
                          <TableCell>{record.altura}</TableCell>
                          <TableCell>
                            <span className={imcCat.color}>
                              {record.imc} <span className="text-xs">({imcCat.label})</span>
                            </span>
                          </TableCell>
                          <TableCell>{record.grasaCorporal > 0 ? `${record.grasaCorporal}%` : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(record)}>
                                <Pencil className="h-3 w-3 mr-1" />Editar
                              </Button>
                              <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openSecondTest(record)}>
                                <RefreshCw className="h-3 w-3 mr-1" />2do Test
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {search ? "No se encontraron registros para ese usuario." : "No hay registros biométricos aún."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contenido: Estadísticas */}
      {activeTab === "Estadísticas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Activity className="h-4 w-4" />IMC Promedio</p>
                <p className="text-3xl font-bold mt-1">{avgIMC}</p>
                <p className="text-xs text-muted-foreground mt-1">{allRecords.length} registros</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Scale className="h-4 w-4" />Peso Promedio</p>
                <p className="text-3xl font-bold mt-1">{avgPeso} <span className="text-base font-normal">kg</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Percent className="h-4 w-4" />Grasa Promedio</p>
                <p className="text-3xl font-bold mt-1">{avgGrasa}<span className="text-base font-normal">{avgGrasa !== "—" ? "%" : ""}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><Activity className="h-4 w-4" />Músculo Promedio</p>
                <p className="text-3xl font-bold mt-1">{avgMusculo}<span className="text-base font-normal">{avgMusculo !== "—" ? "%" : ""}</span></p>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 1 ? (
            <>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5" />Evolución del Peso (últimos 30 registros)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                      <YAxis domain={["dataMin - 2", "dataMax + 2"]} />
                      <Tooltip /><Legend />
                      <Line type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Evolución del IMC (últimos 30 registros)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                      <YAxis domain={[15, 35]} />
                      <Tooltip /><Legend />
                      <Line type="monotone" dataKey="imc" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="IMC" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Se necesitan al menos 2 registros para mostrar gráficos.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Panel flotante: Nuevo Registro */}
      {newDialog && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => { setNewDialog(false); resetNewForm() }} />

          {/* Card flotante lado izquierdo */}
          <div className="relative z-10 m-6 ml-auto w-full max-w-md flex flex-col rounded-2xl bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-purple-600" />
                </div>
                <span className="font-semibold text-base">Nuevo Registro Biométrico</span>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setNewDialog(false); resetNewForm() }}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!docUser ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Ingresa el número de documento para asociar el registro.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Número de documento"
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleDocSearch()}
                    />
                    <Button onClick={handleDocSearch} disabled={!docSearch} className="bg-purple-600 hover:bg-purple-700 shrink-0">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  {docError && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{docError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-emerald-800 truncate">{docUser.nombres}</p>
                      <p className="text-xs text-emerald-600 truncate">Doc: {docUser.numeroDocumento}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={() => { setDocUser(null); setDocSearch("") }}>Cambiar</Button>
                  </div>

                  {saveSuccess && (
                    <Alert className="border-emerald-200 bg-emerald-50">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-700">Registro guardado exitosamente.</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Ruler className="h-3 w-3" />Altura (cm) *</Label>
                      <Input type="number" value={newForm.altura} onChange={e => setNewForm(p => ({ ...p, altura: e.target.value }))} placeholder="170" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Scale className="h-3 w-3" />Peso (kg) *</Label>
                      <Input type="number" step="0.1" value={newForm.peso} onChange={e => setNewForm(p => ({ ...p, peso: e.target.value }))} placeholder="70" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Percent className="h-3 w-3" />Grasa (%)</Label>
                      <Input type="number" step="0.1" value={newForm.grasaCorporal} onChange={e => setNewForm(p => ({ ...p, grasaCorporal: e.target.value }))} placeholder="20" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Activity className="h-3 w-3" />Músculo (%)</Label>
                      <Input type="number" step="0.1" value={newForm.masaMuscular} onChange={e => setNewForm(p => ({ ...p, masaMuscular: e.target.value }))} placeholder="40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cintura (cm)</Label>
                      <Input type="number" step="0.1" value={newForm.circunferenciaCintura} onChange={e => setNewForm(p => ({ ...p, circunferenciaCintura: e.target.value }))} placeholder="80" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cadera (cm)</Label>
                      <Input type="number" step="0.1" value={newForm.circunferenciaCadera} onChange={e => setNewForm(p => ({ ...p, circunferenciaCadera: e.target.value }))} placeholder="95" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs flex items-center gap-1"><Heart className="h-3 w-3" />FC Reposo (bpm)</Label>
                      <Input type="number" value={newForm.frecuenciaCardiacaReposo} onChange={e => setNewForm(p => ({ ...p, frecuenciaCardiacaReposo: e.target.value }))} placeholder="70" />
                    </div>
                    {newForm.altura && newForm.peso && (
                      <div className="col-span-2 flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground">IMC calculado</span>
                        <span className="font-bold text-sm">{calculateIMC(parseFloat(newForm.peso), parseFloat(newForm.altura))}</span>
                      </div>
                    )}
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Notas</Label>
                      <Textarea value={newForm.notas} onChange={e => setNewForm(p => ({ ...p, notas: e.target.value }))} rows={2} placeholder="Observaciones, recomendaciones..." />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setNewDialog(false); resetNewForm() }}>Cancelar</Button>
              {docUser && (
                <Button onClick={handleNewSave} disabled={!newForm.altura || !newForm.peso} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />Guardar Registro
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Editar / Segundo Test */}
      <Dialog open={editDialog.open} onOpenChange={o => setEditDialog(p => ({ ...p, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editDialog.mode === "edit" ? "Editar Registro" : "Segundo Test — Nuevo Registro"}</DialogTitle>
          </DialogHeader>
          {editDialog.mode === "secondTest" && editDialog.record && (
            <Alert className="border-blue-200 bg-blue-50">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                Registro anterior: {new Date(editDialog.record.fecha).toLocaleDateString()} — Peso: {editDialog.record.peso} kg · IMC: {editDialog.record.imc}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Altura (cm) *</Label><Input type="number" value={editForm.altura} onChange={e => setEditForm(p => ({ ...p, altura: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Peso (kg) *</Label><Input type="number" step="0.1" value={editForm.peso} onChange={e => setEditForm(p => ({ ...p, peso: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Grasa Corporal (%)</Label><Input type="number" step="0.1" value={editForm.grasaCorporal} onChange={e => setEditForm(p => ({ ...p, grasaCorporal: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Masa Muscular (%)</Label><Input type="number" step="0.1" value={editForm.masaMuscular} onChange={e => setEditForm(p => ({ ...p, masaMuscular: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Cintura (cm)</Label><Input type="number" step="0.1" value={editForm.circunferenciaCintura} onChange={e => setEditForm(p => ({ ...p, circunferenciaCintura: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Cadera (cm)</Label><Input type="number" step="0.1" value={editForm.circunferenciaCadera} onChange={e => setEditForm(p => ({ ...p, circunferenciaCadera: e.target.value }))} /></div>
            <div className="space-y-2"><Label>FC Reposo (bpm)</Label><Input type="number" value={editForm.frecuenciaCardiacaReposo} onChange={e => setEditForm(p => ({ ...p, frecuenciaCardiacaReposo: e.target.value }))} /></div>
            {editForm.altura && editForm.peso && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">IMC calculado</span>
                <span className="font-bold">{calculateIMC(parseFloat(editForm.peso), parseFloat(editForm.altura))}</span>
              </div>
            )}
            <div className="space-y-2 col-span-2"><Label>Notas</Label><Textarea value={editForm.notas} onChange={e => setEditForm(p => ({ ...p, notas: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, record: null, mode: "edit" })}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={!editForm.altura || !editForm.peso}
              className={editDialog.mode === "secondTest" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}>
              <Save className="h-4 w-4 mr-2" />{editDialog.mode === "edit" ? "Guardar Cambios" : "Guardar 2do Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
