// app/admin/torneios/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateFullBracket, isByeMatch } from "@/lib/tournament/bracket";
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

export default async function AdminTournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireAdmin();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!tournament) return notFound();

  const { data: teams } = await supabase
    .from("tournament_teams")
    .select("team_id, teams:teams(id,name,color)")
    .eq("tournament_id", id);

  const { data: allTeams } = await supabase
    .from("teams")
    .select("id,name,color")
    .order("created_at", { ascending: false });

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("id,round,match_index,status,team1_id,team2_id,winner_team_id,next_match_id,next_match_slot,starts_at,ends_at")
    .eq("tournament_id", id)
    .order("round", { ascending: true })
    .order("match_index", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{tournament.name}</h1>
          <div className="text-sm text-muted-foreground">Status: {tournament.status}</div>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/torneios/${id}/live`}>Ver transmissão</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-4"
            action={async (formData) => {
              "use server";
              const supabase = await requireAdmin();
              const registration_starts_at = String(formData.get("registration_starts_at") ?? "").trim();
              const registration_ends_at = String(formData.get("registration_ends_at") ?? "").trim();
              const max_teams = Number(formData.get("max_teams") ?? tournament.max_teams ?? 8);
              const question_time_seconds = Number(formData.get("question_time_seconds") ?? tournament.question_time_seconds ?? 30);
              const status = String(formData.get("status") ?? tournament.status);

              await supabase
                .from("tournaments")
                .update({
                  registration_starts_at: registration_starts_at ? new Date(registration_starts_at).toISOString() : null,
                  registration_ends_at: registration_ends_at ? new Date(registration_ends_at).toISOString() : null,
                  max_teams,
                  question_time_seconds,
                  status,
                })
                .eq("id", id);

              revalidatePath(`/admin/torneios/${id}`);
            }}
          >
            <Input name="registration_starts_at" placeholder="registration_starts_at (ISO)" defaultValue={tournament.registration_starts_at ?? ""} />
            <Input name="registration_ends_at" placeholder="registration_ends_at (ISO)" defaultValue={tournament.registration_ends_at ?? ""} />
            <Input name="max_teams" type="number" min={2} defaultValue={tournament.max_teams ?? 8} />
            <Input name="question_time_seconds" type="number" min={5} defaultValue={tournament.question_time_seconds ?? 30} />
            <Input name="status" placeholder="draft | registration | in_progress | completed" defaultValue={tournament.status} />
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipes no torneio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {(teams ?? []).map((t) => (
                <div key={t.team_id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded" style={{ background: (t.teams as any)?.color ?? "#ddd" }} />
                    {(t.teams as any)?.name ?? t.team_id}
                  </div>

                  <form
                    action={async () => {
                      "use server";
                      const supabase = await requireAdmin();
                      await supabase
                        .from("tournament_teams")
                        .delete()
                        .eq("tournament_id", id)
                        .eq("team_id", t.team_id);
                      revalidatePath(`/admin/torneios/${id}`);
                    }}
                  >
                    <Button variant="ghost" size="sm">Remover</Button>
                  </form>
                </div>
              ))}
            </div>

            <form
              className="flex gap-2"
              action={async (formData) => {
                "use server";
                const supabase = await requireAdmin();
                const team_id = String(formData.get("team_id") ?? "");
                if (!team_id) return;
                await supabase.from("tournament_teams").insert({ tournament_id: id, team_id });
                revalidatePath(`/admin/torneios/${id}`);
              }}
            >
              <select name="team_id" className="h-10 flex-1 rounded-md border bg-background px-3 text-sm">
                <option value="">Vincular equipe existente…</option>
                {(allTeams ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <Button type="submit">Vincular</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chaveamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              action={async () => {
                "use server";
                const supabase = await requireAdmin();

                // não regenerar em in_progress sem confirmação forte
                const { data: t } = await supabase.from("tournaments").select("status").eq("id", id).single();
                if (t?.status === "in_progress") throw new Error("Não pode regenerar com torneio em andamento.");

                // apagar e recriar
                await supabase.from("tournament_matches").delete().eq("tournament_id", id);

                const { data: tteams } = await supabase
                  .from("tournament_teams")
                  .select("team_id, teams:teams(id,name)")
                  .eq("tournament_id", id);

                const seeds = (tteams ?? []).map((x) => ({ id: x.team_id, name: (x.teams as any)?.name }));
                if (seeds.length < 2) throw new Error("Precisa de pelo menos 2 equipes.");

                const seedsBracket = generateFullBracket(seeds);

                // Insert base
                const insertRows = seedsBracket.map((m) => ({
                  tournament_id: id,
                  round: m.round,
                  match_index: m.match_index,
                  status: "pending",
                  team1_id: m.team1_id,
                  team2_id: m.team2_id,
                  next_match_id: null,
                  next_match_slot: null,
                  bracket_key: m.key, // coluna adicionada no schema para ajudar mapping
                }));

                const { data: inserted, error } = await supabase
                  .from("tournament_matches")
                  .insert(insertRows)
                  .select("id, bracket_key");
                if (error) throw error;

                const map = new Map<string, string>();
                (inserted ?? []).forEach((x) => map.set((x as any).bracket_key, x.id));

                // Update next pointers
                for (const m of seedsBracket) {
                  if (!m.next_key || !m.next_slot) continue;
                  const idNow = map.get(m.key)!;
                  const idNext = map.get(m.next_key)!;
                  await supabase
                    .from("tournament_matches")
                    .update({ next_match_id: idNext, next_match_slot: m.next_slot })
                    .eq("id", idNow);
                }

                revalidatePath(`/admin/torneios/${id}`);
              }}
            >
              <CopyButton text={t.invite_code ?? ""} variant="secondary" size="sm">
                Gerar / Regenerar Bracket
              </CopyButton>
            </form>

            <form
              action={async () => {
                "use server";
                const supabase = await requireAdmin();
                // inicia via RPC (admin only)
                await supabase.rpc("start_tournament", { p_tournament_id: id, p_auto_start: true });
                revalidatePath(`/admin/torneios/${id}`);
              }}
            >
              <Button type="submit">Iniciar torneio (auto)</Button>
            </form>

            <div className="text-sm text-muted-foreground">
              Matches: {(matches ?? []).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visualização do Bracket (simplificado)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <BracketSimple matches={matches ?? []} teams={(allTeams ?? [])} />
        </CardContent>
      </Card>
    </div>
  );
}

function BracketSimple({
  matches,
  teams,
}: {
  matches: any[];
  teams: { id: string; name: string; color: string | null }[];
}) {
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? (id ? id.slice(0, 8) : "BYE");
  const grouped = new Map<number, any[]>();
  for (const m of matches) {
    grouped.set(m.round, [...(grouped.get(m.round) ?? []), m]);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[...grouped.entries()].sort((a, b) => a[0] - b[0]).map(([round, ms]) => (
        <div key={round} className="space-y-2">
          <div className="text-sm font-medium">Round {round}</div>
          <div className="space-y-2">
            {ms.map((m) => (
              <div key={m.id} className="rounded border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <div>{teamName(m.team1_id)} vs {teamName(m.team2_id)}</div>
                  <div className="text-xs text-muted-foreground">{m.status}</div>
                </div>
                {m.winner_team_id && (
                  <div className="mt-1 text-xs">
                    Winner: <b>{teamName(m.winner_team_id)}</b>
                  </div>
                )}
                {isByeMatch({ team1_id: m.team1_id, team2_id: m.team2_id }) && (
                  <div className="mt-1 text-xs text-muted-foreground">BYE</div>
                )}
                <div className="mt-2 flex gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/torneios/${m.tournament_id}/match/${m.id}`}>Abrir duelo</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
