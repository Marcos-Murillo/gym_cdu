"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, UserPlus, ChevronRight, ChevronLeft, Loader2 } from "lucide-react"
import { GENEROS, GENEROS_LABELS, TIPOS_DOCUMENTO, ESTAMENTOS, FACULTADES, PROGRAMAS_POR_FACULTAD } from "@/lib/data"
import { saveUser, getUserByDocument } from "@/lib/storage"
import type { FormData } from "@/lib/types"

export function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nombres: "",
    correo: "",
    genero: "",
    tipoDocumento: "",
    numeroDocumento: "",
    edad: "",
    telefono: "",
    estamento: "",
    facultad: "",
    programaAcademico: "",
    codigoEstudiantil: "",
  })

  const requiresAcademicInfo = formData.estamento === "ESTUDIANTE" || formData.estamento === "EGRESADO" || formData.estamento === "DOCENTE"
  const requiresCodigoEstudiantil = formData.estamento === "ESTUDIANTE" || formData.estamento === "EGRESADO"
  const totalSteps = requiresAcademicInfo ? 3 : 2

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      
      // Limpiar programa cuando cambia la facultad
      if (field === "facultad") {
        newData.programaAcademico = ""
      }
      
      // Limpiar campos académicos cuando el estamento no los requiere
      if (field === "estamento") {
        if (!["ESTUDIANTE", "EGRESADO", "DOCENTE"].includes(value)) {
          newData.facultad = ""
          newData.programaAcademico = ""
        }
        if (!["ESTUDIANTE", "EGRESADO"].includes(value)) {
          newData.codigoEstudiantil = ""
        }
      }
      
      return newData
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.nombres &&
          formData.correo &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo) &&
          formData.genero &&
          formData.tipoDocumento &&
          formData.numeroDocumento &&
          formData.edad &&
          formData.telefono
        )
      case 2:
        return !!formData.estamento
      case 3:
        if (requiresAcademicInfo) {
          const hasAcademicInfo = !!(formData.facultad && formData.programaAcademico)
          const hasCodigoIfRequired = !requiresCodigoEstudiantil || (formData.codigoEstudiantil.length === 9)
          return hasAcademicInfo && hasCodigoIfRequired
        }
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
      setError("")
    } else {
      setError("Por favor completa todos los campos requeridos")
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setError("")
  }

  const handleSubmit = async () => {
    setError("")
    setLoading(true)

    try {
      // Verificar si el usuario ya existe
      const existingUser = await getUserByDocument(formData.numeroDocumento)
      if (existingUser) {
        setError("Ya existe un usuario registrado con este numero de documento")
        setLoading(false)
        return
      }

      // Preparar datos del usuario
      const userData: any = {
        nombres: formData.nombres,
        correo: formData.correo,
        genero: formData.genero,
        tipoDocumento: formData.tipoDocumento,
        numeroDocumento: formData.numeroDocumento,
        edad: parseInt(formData.edad),
        telefono: formData.telefono,
        estamento: formData.estamento,
        facultad: formData.facultad || "N/A",
        programaAcademico: formData.programaAcademico || "N/A",
      }
      
      // Solo agregar código estudiantil si tiene valor
      if (formData.codigoEstudiantil && formData.codigoEstudiantil.trim()) {
        userData.codigoEstudiantil = formData.codigoEstudiantil.trim()
      }
      
      // Guardar usuario
      await saveUser(userData)

      setSuccess(true)
    } catch (err) {
      setError("Error al guardar el usuario. Por favor intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombres: "",
      correo: "",
      genero: "",
      tipoDocumento: "",
      numeroDocumento: "",
      edad: "",
      telefono: "",
      estamento: "",
      facultad: "",
      programaAcademico: "",
      codigoEstudiantil: "",
    })
    setCurrentStep(1)
    setSuccess(false)
    setError("")
  }

  if (success) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Gracias por registrarte</h2>
              <p className="text-muted-foreground text-lg">
                Ahora puedes disfrutar de nuestro gimnasio
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Tu codigo de acceso es: <span className="font-mono font-bold text-emerald-600">{formData.numeroDocumento}</span>
            </p>
            <Button onClick={resetForm} className="bg-emerald-600 hover:bg-emerald-700">
              Registrar otra persona
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Registro de Usuario</CardTitle>
            <CardDescription>Paso {currentStep} de {totalSteps}</CardDescription>
          </div>
        </div>
        {/* Progress bar */}
        <div className="flex gap-2 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors ${
                i < currentStep ? "bg-emerald-600" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Informacion Personal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombres">Nombres y Apellidos *</Label>
                <Input
                  id="nombres"
                  value={formData.nombres}
                  onChange={(e) => handleInputChange("nombres", e.target.value)}
                  placeholder="Ingresa tu nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correo">Correo Institucional *</Label>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => handleInputChange("correo", e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
                {formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo) && (
                  <p className="text-xs text-destructive">Ingresa un correo electrónico válido</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="genero">Genero *</Label>
                <Select value={formData.genero} onValueChange={(value) => handleInputChange("genero", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu genero" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENEROS.map((genero) => (
                      <SelectItem key={genero} value={genero}>
                        {GENEROS_LABELS[genero]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edad">Edad *</Label>
                <Input
                  id="edad"
                  type="number"
                  value={formData.edad}
                  onChange={(e) => handleInputChange("edad", e.target.value)}
                  placeholder="Tu edad"
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipoDocumento">Tipo de Documento *</Label>
                <Select
                  value={formData.tipoDocumento}
                  onValueChange={(value) => handleInputChange("tipoDocumento", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo de documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroDocumento">Numero de Documento *</Label>
                <Input
                  id="numeroDocumento"
                  value={formData.numeroDocumento}
                  onChange={(e) => handleInputChange("numeroDocumento", e.target.value)}
                  placeholder="Numero de documento"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Telefono / Celular *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleInputChange("telefono", e.target.value)}
                placeholder="Numero de telefono"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Informacion Institucional</h3>
            <div className="space-y-2">
              <Label htmlFor="estamento">Estamento *</Label>
              <Select value={formData.estamento} onValueChange={(value) => handleInputChange("estamento", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu estamento" />
                </SelectTrigger>
                <SelectContent>
                  {ESTAMENTOS.map((estamento) => (
                    <SelectItem key={estamento} value={estamento}>
                      {estamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {currentStep === 3 && requiresAcademicInfo && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Informacion Academica</h3>
            
            {requiresCodigoEstudiantil && (
              <div className="space-y-2">
                <Label htmlFor="codigoEstudiantil">Codigo Estudiantil * (9 dígitos, ej: 202625413)</Label>
                <Input
                  id="codigoEstudiantil"
                  value={formData.codigoEstudiantil}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 9)
                    handleInputChange("codigoEstudiantil", val)
                  }}
                  placeholder="202625413"
                  maxLength={9}
                  inputMode="numeric"
                />
                {formData.codigoEstudiantil && formData.codigoEstudiantil.length !== 9 && (
                  <p className="text-xs text-destructive">El código debe tener exactamente 9 dígitos</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="facultad">Facultad *</Label>
              <Select 
                key={`facultad-${formData.estamento}`}
                value={formData.facultad} 
                onValueChange={(value) => handleInputChange("facultad", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu facultad" />
                </SelectTrigger>
                <SelectContent>
                  {FACULTADES.map((facultad) => (
                    <SelectItem key={facultad} value={facultad}>
                      {facultad}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.facultad && (
              <div className="space-y-2">
                <Label htmlFor="programaAcademico">Programa Academico *</Label>
                <Select
                  key={`programa-${formData.facultad}`}
                  value={formData.programaAcademico}
                  onValueChange={(value) => handleInputChange("programaAcademico", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {(PROGRAMAS_POR_FACULTAD[formData.facultad] || []).map((programa) => (
                      <SelectItem key={programa} value={programa}>
                        {programa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700">
              Siguiente
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Completar Registro
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
