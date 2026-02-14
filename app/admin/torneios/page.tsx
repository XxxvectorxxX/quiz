// app/admin/torneios/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("401");
  const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
  if (!isAdmin) throw new Error("403");
  return supabase;
}

export default async function AdminTournamentsPage() {
  const supabase = await requireAdmin();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id,name,status,starts_at,created_at,max_teams,question_time_seconds")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin • Torneios</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Criar torneio</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            action={async (formData) => {
              "use server";
              const supabase = await requireAdmin();
              const name = String(formData.get("name") ?? "").trim();
              const maxTeams = Number(formData.get("max_teams") ?? 8);
              const qtime = Number(formData.get("question_time_seconds") ?? 30);

              if (name.length < 2) throw new Error("Nome inválido");

              const { data: me } = await supabase.auth.getUser();

              const { data: created, error } = await supabase
                .from("tournaments")
                .insert({
                  name,
                  mode: "single_elimination",
                  competition_mode: "tournament",
                  status: "draft",
                  max_teams: maxTeams,
                  question_time_seconds: qtime,
                  created_by: me.user!.id,
                })
                .select("id")
                .single();

              if (error) throw error;

              revalidatePath("/admin/torneios");
            }}
          >
            <Input name="name" placeholder="Nome" required />
            <Input name="max_teams" type="number" min={2} defaultValue={8} />
            <Input name="question_time_seconds" type="number" min={5} defaultValue={30} />
            <Button type="submit">Criar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {(tournaments ?? []).map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">{t.name}</CardTitle>
              <div className="flex gap-2">
                <Button asChild variant="secondary">
                  <Link href={`/admin/torneios/${t.id}`}>Abrir</Link>
                </Button>

                <form
                  action={async () => {
                    "use server";
                    const supabase = await requireAdmin();
                    await supabase.from("tournaments").delete().eq("id", t.id);
                    revalidatePath("/admin/torneios");
                  }}
                >
                  <Button
                    variant="destructive"
                    onClick={(e) => {
                      // @ts-expect-error
                      if (!confirm("Excluir torneio? Isso remove matches/pivots (cascade).")) e.preventDefault();
                    }}
                  >
                    Excluir
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Status: {t.status} • max_teams: {t.max_teams} • tempo: {t.question_time_seconds}s
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
