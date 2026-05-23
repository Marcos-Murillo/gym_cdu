import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { resolveSede } from "@/lib/sede"

const SSO_SECRET = process.env.SSO_SECRET!

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json({ error: "Token requerido." }, { status: 400 })
    }

    const payload = jwt.verify(token, SSO_SECRET) as {
      uid: string
      nombre: string
      cedula: string
      rol: string
      espacio?: string
      sede?: string
      platform: string
    }

    let sede = payload.sede ? resolveSede(payload.sede) : undefined
    if (payload.cedula) {
      const snap = await getDocs(collection(db, "systemUsers"))
      const match = snap.docs.find((d) => d.data().cedula === payload.cedula)
      if (match?.data()?.sede) {
        sede = resolveSede(String(match.data().sede))
      }
    }
    if (!sede) sede = resolveSede(undefined)

    return NextResponse.json({
      uid: payload.uid,
      nombre: payload.nombre,
      cedula: payload.cedula,
      rol: payload.rol,
      espacio: payload.espacio ?? null,
      sede,
    })
  } catch (err) {
    const message = (err as Error).message ?? ""
    if (message.includes("expired")) {
      return NextResponse.json({ error: "El enlace de acceso ha expirado. Vuelve a intentarlo." }, { status: 401 })
    }
    return NextResponse.json({ error: "Token inválido." }, { status: 401 })
  }
}
