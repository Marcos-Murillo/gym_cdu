import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { AttendanceStats } from "./types"

export function generateGymPDFReport(
  stats: AttendanceStats,
  filtro: "todas" | "gimnasio" | "piscina"
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let currentY = 20

  const filtroLabel =
    filtro === "todas" ? "Todas las instalaciones" : filtro === "gimnasio" ? "Gimnasio" : "Piscina"

  // ── Portada ──────────────────────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("INFORME DE ESTADÍSTICAS", pageWidth / 2, currentY, { align: "center" })
  currentY += 10

  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text("CDU Gym — Universidad del Valle", pageWidth / 2, currentY, { align: "center" })
  currentY += 7

  doc.setFontSize(10)
  doc.text(`Instalación: ${filtroLabel}`, pageWidth / 2, currentY, { align: "center" })
  currentY += 5
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CO")}`, pageWidth / 2, currentY, { align: "center" })
  currentY += 15

  // ── 1. Resumen general ───────────────────────────────────────────────────
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("1. RESUMEN GENERAL", 14, currentY)
  currentY += 7

  const resumenBody: string[][] = [
    ["Total usuarios registrados", stats.totalUsuarios.toString()],
    [
      filtro === "todas"
        ? "Total entradas (todas)"
        : filtro === "gimnasio"
        ? "Total entradas gimnasio"
        : "Total entradas piscina",
      stats.totalEntradas.toString(),
    ],
  ]

  if (filtro === "todas") {
    resumenBody.push(["Entradas gimnasio", stats.totalGimnasio.toString()])
    resumenBody.push(["Usuarios únicos gimnasio", (stats.usuariosUnicosGimnasio ?? 0).toString()])
    resumenBody.push(["Entradas piscina", stats.totalPiscina.toString()])
    resumenBody.push(["Usuarios únicos piscina", (stats.usuariosUnicosPiscina ?? 0).toString()])
  } else {
    resumenBody.push(["Usuarios únicos en el espacio", (stats.usuariosUnicos ?? 0).toString()])
    if (stats.entradasPorDia.length > 0) {
      const promedio = Math.round(stats.totalEntradas / stats.entradasPorDia.length)
      resumenBody.push(["Promedio diario de entradas", promedio.toString()])
    }
    if (stats.entradasPorHora.length > 0) {
      const horaPico = stats.entradasPorHora.reduce((a, b) => (a.cantidad > b.cantidad ? a : b)).hora
      resumenBody.push(["Hora pico", horaPico])
    }
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Indicador", "Valor"]],
    body: resumenBody,
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 10 },
  })
  currentY = (doc as any).lastAutoTable.finalY + 15

  // ── 2. Distribución por género ───────────────────────────────────────────
  if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20 }

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("2. DISTRIBUCIÓN POR GÉNERO", 14, currentY)
  currentY += 7

  const totalGenero = Object.values(stats.porGenero).reduce((a, b) => a + b, 0)
  const generoBody = Object.entries(stats.porGenero)
    .sort(([, a], [, b]) => b - a)
    .map(([genero, cantidad]) => [
      genero,
      cantidad.toString(),
      totalGenero > 0 ? `${Math.round((cantidad / totalGenero) * 100)}%` : "0%",
    ])

  autoTable(doc, {
    startY: currentY,
    head: [["Género", "Cantidad", "Porcentaje"]],
    body: generoBody,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 10 },
  })
  currentY = (doc as any).lastAutoTable.finalY + 15

  // ── 3. Distribución por estamento ────────────────────────────────────────
  if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20 }

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("3. DISTRIBUCIÓN POR ESTAMENTO", 14, currentY)
  currentY += 7

  const totalEstamento = Object.values(stats.porEstamento).reduce((a, b) => a + b, 0)
  const estamentoBody = Object.entries(stats.porEstamento)
    .sort(([, a], [, b]) => b - a)
    .map(([estamento, cantidad]) => [
      estamento,
      cantidad.toString(),
      totalEstamento > 0 ? `${Math.round((cantidad / totalEstamento) * 100)}%` : "0%",
    ])

  autoTable(doc, {
    startY: currentY,
    head: [["Estamento", "Cantidad", "Porcentaje"]],
    body: estamentoBody,
    theme: "grid",
    headStyles: { fillColor: [245, 158, 11], fontStyle: "bold" },
    margin: { left: 14, right: 14 },
    styles: { fontSize: 10 },
  })
  currentY = (doc as any).lastAutoTable.finalY + 15

  // ── 4. Distribución por facultad ─────────────────────────────────────────
  const facultadEntries = Object.entries(stats.porFacultad)
    .filter(([f]) => f && f !== "N/A" && f !== "")
    .sort(([, a], [, b]) => b - a)

  if (facultadEntries.length > 0) {
    doc.addPage()
    currentY = 20

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("4. DISTRIBUCIÓN POR FACULTAD", 14, currentY)
    currentY += 7

    const totalFacultad = facultadEntries.reduce((acc, [, v]) => acc + v, 0)
    const facultadBody = facultadEntries.map(([facultad, cantidad]) => [
      facultad.replace("FACULTAD DE ", ""),
      cantidad.toString(),
      totalFacultad > 0 ? `${Math.round((cantidad / totalFacultad) * 100)}%` : "0%",
    ])

    autoTable(doc, {
      startY: currentY,
      head: [["Facultad", "Usuarios", "Porcentaje"]],
      body: facultadBody,
      theme: "grid",
      headStyles: { fillColor: [139, 92, 246], fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 15
  }

  // ── 5. Distribución por programa académico ───────────────────────────────
  const programaEntries = Object.entries(stats.porPrograma)
    .filter(([p]) => p && p !== "N/A" && p !== "")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)

  if (programaEntries.length > 0) {
    if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20 }

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("5. TOP 20 PROGRAMAS ACADÉMICOS", 14, currentY)
    currentY += 7

    const totalPrograma = programaEntries.reduce((acc, [, v]) => acc + v, 0)
    const programaBody = programaEntries.map(([programa, cantidad]) => [
      programa,
      cantidad.toString(),
      totalPrograma > 0 ? `${Math.round((cantidad / totalPrograma) * 100)}%` : "0%",
    ])

    autoTable(doc, {
      startY: currentY,
      head: [["Programa Académico", "Usuarios", "Porcentaje"]],
      body: programaBody,
      theme: "grid",
      headStyles: { fillColor: [236, 72, 153], fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 15
  }

  // ── 6. Entradas por día (últimos 30 días) ────────────────────────────────
  if (stats.entradasPorDia.length > 0) {
    doc.addPage()
    currentY = 20

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("6. ENTRADAS POR DÍA (ÚLTIMOS 30 DÍAS)", 14, currentY)
    currentY += 7

    const diaBody = stats.entradasPorDia.map(({ fecha, cantidad }) => [
      new Date(fecha + "T00:00:00").toLocaleDateString("es-CO"),
      cantidad.toString(),
    ])

    autoTable(doc, {
      startY: currentY,
      head: [["Fecha", "Entradas"]],
      body: diaBody,
      theme: "grid",
      headStyles: { fillColor: [14, 165, 233], fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    })
    currentY = (doc as any).lastAutoTable.finalY + 15
  }

  // ── 7. Entradas por hora ─────────────────────────────────────────────────
  if (stats.entradasPorHora.length > 0) {
    if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20 }

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("7. DISTRIBUCIÓN POR HORA DEL DÍA", 14, currentY)
    currentY += 7

    const horaBody = stats.entradasPorHora.map(({ hora, cantidad }) => [hora, cantidad.toString()])

    autoTable(doc, {
      startY: currentY,
      head: [["Hora", "Entradas"]],
      body: horaBody,
      theme: "grid",
      headStyles: { fillColor: [239, 68, 68], fontStyle: "bold" },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    })
  }

  // ── Pie de página ────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
  }

  const fileName = `Estadisticas_GymCDU_${filtroLabel.replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
  doc.save(fileName)
}
