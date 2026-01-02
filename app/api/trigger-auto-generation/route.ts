import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Verificar se o usuário é admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    // Chamar o endpoint de geração automática
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"
    const url = `${baseUrl}/api/cron/gerar-perguntas-auto`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        authorization: process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : "",
      },
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Erro ao disparar geração automática:", error)
    return NextResponse.json({ error: "Erro ao disparar geração automática" }, { status: 500 })
  }
}
