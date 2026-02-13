"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!me?.is_admin) throw new Error("Sem permissão")

  return { supabase }
}

export async function adminUpdateProfile(formData: FormData) {
  const { supabase } = await requireAdmin()

  const id = String(formData.get("id"))
  const full_name = String(formData.get("full_name") ?? "")
  const age_category = String(formData.get("age_category") ?? "")
  const is_admin = formData.get("is_admin") === "on"

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, age_category, is_admin })
    .eq("id", id)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/usuarios")
}
