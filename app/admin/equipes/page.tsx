import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddMemberForm } from "@/components/admin/AddMemberForm";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: isAdmin, error: adminErr } = await supabase.rpc("current_user_is_admin");
  if (adminErr) throw new Error(adminErr.message);
  if (!isAdmin) redirect("/"); // ou /403

  return { supabase, user };
}

export default async function AdminTeamsPage() {
  const { supabase, user } = await requireAdmin();

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id,name,color,leader_id,competition_mode,created_at")
    .order("created_at", { ascending: false });

  if (teamsErr) throw new Error(teamsErr.message);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Admin • Equipes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Criar equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-3"
            action={async (formData) => {
              "use server";
              const { supabase, user } = await requireAdmin();
              const name = String(formData.get("name") ?? "").trim();
              const color = String(formData.get("color") ?? "").trim();

              if (name.length < 2) throw new Error("Nome inválido");

              const { error } = await supabase.from("teams").insert({
                name,
                color: color || null,
                leader_id: user.id,
                competition_mode: "tournament",
              });

              if (error) throw new Error(error.message);
              revalidatePath("/admin/equipes");
            }}
          >
            <Input name="name" placeholder="Nome" required />
            <Input name="color" placeholder="#RRGGBB (opcional)" />
            <Button type="submit">Criar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {(teams ?? []).map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">
                {t.name}{" "}
                <span className="ml-2 rounded px-2 py-1 text-xs" style={{ background: t.color ?? "#eee" }}>
                  {t.color ?? "sem cor"}
                </span>
              </CardTitle>

              <form
                action={async () => {
                  "use server";
                  const { supabase } = await requireAdmin();
                  const { error } = await supabase.from("teams").delete().eq("id", t.id);
                  if (error) throw new Error(error.message);
                  revalidatePath("/admin/equipes");
                }}
              >
                <ConfirmSubmitButton
                 variant="destructive"
                 confirmText="Excluir equipe? Isso apagará membros e vínculos (cascade)."
                  >
                   Excluir
               </ConfirmSubmitButton>
              </form>
            </CardHeader>

            <CardContent className="space-y-4">
              <TeamMembers teamId={t.id} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function TeamMembers({ teamId }: { teamId: string }) {
  const { supabase } = await requireAdmin();

  const { data: members, error } = await supabase
    .from("team_members")
    .select("id,user_id,role,joined_at,profiles:profiles(id,full_name,email)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  async function addMemberAction(formData: FormData) {
    "use server";
    const { supabase } = await requireAdmin();
    const team_id = String(formData.get("team_id") ?? "");
    const user_id = String(formData.get("user_id") ?? "");
    if (!team_id || !user_id) throw new Error("Selecione um usuário.");

    const { error } = await supabase.from("team_members").insert({
      team_id,
      user_id,
      role: "member",
    });

    if (error) throw new Error(error.message);
    revalidatePath("/admin/equipes");
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Membros</div>

      <div className="rounded-md border">
        <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
          <div className="col-span-6">Usuário</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-1" />
        </div>

        {(members ?? []).map((m) => (
          <div key={m.id} className="grid grid-cols-12 gap-2 p-2 text-sm">
            <div className="col-span-6">{(m as any).profiles?.full_name ?? m.user_id}</div>
            <div className="col-span-3">{(m as any).profiles?.email ?? "—"}</div>
            <div className="col-span-2">{m.role}</div>
            <div className="col-span-1 text-right">
              <form
                action={async () => {
                  "use server";
                  const { supabase } = await requireAdmin();
                  const { error } = await supabase.from("team_members").delete().eq("id", m.id);
                  if (error) throw new Error(error.message);
                  revalidatePath("/admin/equipes");
                }}
              >
                <Button variant="ghost" size="sm">
                  Remover
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar membro</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMemberForm teamId={teamId} addMemberAction={addMemberAction} />
        </CardContent>
      </Card>
    </div>
  );
}
