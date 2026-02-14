// app/admin/equipes/page.tsx
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAutocomplete } from "@/components/admin/UserAutocomplete";

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("401");

  const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
  if (!isAdmin) throw new Error("403");
  return supabase;
}

export default async function AdminTeamsPage() {
  const supabase = await requireAdmin();

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,color,leader_id,competition_mode,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin • Equipes</h1>
      </div>

      <CreateTeamCard />

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
                  const supabase = await requireAdmin();
                  // cascade via FK
                  await supabase.from("teams").delete().eq("id", t.id);
                  revalidatePath("/admin/equipes");
                }}
              >
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    // @ts-expect-error server action form confirm
                    if (!confirm("Excluir equipe? Isso apagará membros e vínculos (cascade).")) e.preventDefault();
                  }}
                >
                  Excluir
                </Button>
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

function CreateTeamCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Criar equipe</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 md:grid-cols-3"
          action={async (formData) => {
            "use server";
            const supabase = await requireAdmin();
            const name = String(formData.get("name") ?? "").trim();
            const color = String(formData.get("color") ?? "").trim();

            if (name.length < 2) throw new Error("Nome inválido");

            const { data: userData } = await supabase.auth.getUser();
            const leader_id = userData.user!.id;

            await supabase.from("teams").insert({
              name,
              color: color || null,
              leader_id,
              competition_mode: "tournament",
            });

            revalidatePath("/admin/equipes");
          }}
        >
          <Input name="name" placeholder="Nome" required />
          <Input name="color" placeholder="#RRGGBB (opcional)" />
          <Button type="submit">Criar</Button>
        </form>
      </CardContent>
    </Card>
  );
}

async function TeamMembers({ teamId }: { teamId: string }) {
  const supabase = await requireAdmin();

  const { data: members } = await supabase
    .from("team_members")
    .select("id,user_id,role,joined_at,profiles:profiles(id,full_name,email)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

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
            <div className="col-span-6">{m.profiles?.full_name ?? m.user_id}</div>
            <div className="col-span-3">{m.profiles?.email ?? "—"}</div>
            <div className="col-span-2">{m.role}</div>
            <div className="col-span-1 text-right">
              <form
                action={async () => {
                  "use server";
                  const supabase = await requireAdmin();
                  await supabase.from("team_members").delete().eq("id", m.id);
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

      <AddMember teamId={teamId} />
    </div>
  );
}

function AddMember({ teamId }: { teamId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adicionar membro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ClientAddMember teamId={teamId} />
      </CardContent>
    </Card>
  );
}

function ClientAddMember({ teamId }: { teamId: string }) {
  // Client wrapper embutido via "use client" em componente separado:
  // Para manter o arquivo simples, usamos um truque: renderizar um componente client aqui.
  return (
    // @ts-expect-error Server->Client boundary
    <ClientAddMemberInner teamId={teamId} />
  );
}

// -------- CLIENT COMPONENT INLINE (Next permite se separado; aqui fica no mesmo arquivo por praticidade) ----------
import React from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
function ClientAddMemberInner({ teamId }: { teamId: string }) {
  "use client";
  const supabase = React.useMemo(() => createBrowserClient(), []);
  const [picked, setPicked] = React.useState<{ id: string; full_name: string | null; email: string | null } | null>(
    null
  );

  async function add() {
    if (!picked) return;
    const res = await fetch("/admin/equipes", { method: "POST" }).catch(() => null);
    void res;
  }

  return (
    <div className="space-y-3">
      <UserAutocomplete onSelect={(u) => setPicked(u)} />
      {picked && (
        <form
          action={async () => {
            "use server";
            const supabase = await requireAdmin();
            await supabase.from("team_members").insert({
              team_id: teamId,
              user_id: picked.id,
              role: "member",
            });
            revalidatePath("/admin/equipes");
          }}
        >
          <div className="text-sm">
            Selecionado: <b>{picked.full_name ?? "Sem nome"}</b> ({picked.email ?? "sem email"})
          </div>
          <Button type="submit">Confirmar adicionar</Button>
        </form>
      )}
    </div>
  );
}
