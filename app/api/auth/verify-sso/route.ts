import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

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
      platform: string
    }

    return NextResponse.json({
      uid: payload.uid,
      nombre: payload.nombre,
      cedula: payload.cedula,
      rol: payload.rol,
      espacio: payload.espacio ?? null,
    })
  } catch (err) {
    const message = (err as Error).message ?? ""
    if (message.includes("expired")) {
      return NextResponse.json({ error: "El enlace de acceso ha expirado. Vuelve a intentarlo." }, { status: 401 })
    }
    return NextResponse.json({ error: "Token inválido." }, { status: 401 })
  }
}
