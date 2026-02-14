import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") || "").trim()

  if (q.length < 2) return NextResponse.json({ users: [] })

  // busca por email OU nome
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(8)

  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ users: data ?? [] })
}
