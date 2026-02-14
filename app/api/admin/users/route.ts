// app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // admin guard via RPC (security definer)
  const { data: isAdmin, error: adminErr } = await supabase.rpc("current_user_is_admin");
  if (adminErr) return NextResponse.json({ error: "admin_check_failed" }, { status: 500 });
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .or(`full_name.ilike.${like},email.ilike.${like}`)
    .order("full_name", { ascending: true })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data ?? [] });
}
