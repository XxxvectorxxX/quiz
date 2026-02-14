import { redirect } from "next/navigation"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Trophy, Users, Plus, Brackets } from "lucide-react"
import { DeleteTournamentButton } from "@/components/DeleteTournamentButton"

export const dynamic = "force-dynamic"

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("id,is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) redirect("/quiz")

  return { supabase, user }
}

async function updateTournamentAction(formData: FormData) {
  "use server"
  const { supabase } = await assertAdmin()

  const id = String(formData.get("id") || "")
  const name = String(formData.get("name") || "")
  const status = String(formData.get("status") || "draft")
  const maxTeamsRaw = String(formData.get("max_teams") || "")
  const registrationStartsAt = String(formData.get("registration_starts_at") || "")
  const registrationEndsAt = String(formData.get("registration_ends_at") || "")

  const max_teams = maxTeamsRaw ? Number(maxTeamsRaw) : null

  await supabase
    .from("tournaments")
    .update({
      name,
      status,
      max_teams,
      registration_starts_at: registrationStartsAt ? new Date(registrationStartsAt).toISOString() : null,
      registration_ends_at: registrationEndsAt ? new Date(registrationEndsAt).toISOString() : null,
    })
    .eq("id", id)

  revalidatePath(`/admin/torneios/${id}`)
  revalidatePath("/admin/torneios")
  revalidatePath(`/torneios/${id}`)
}

async function createTeamAction(formData: FormData) {
  "use server"
  const { supabase, user } = await assertAdmin()

  const tournamentId = String(formData.get("tournament_id") || "")
  const name = String(formData.get("team_name") || "").trim()
  const color = String(formData.get("team_color") || "#7c3aed").trim()

  if (!name) return

  // 1) cria a equipe (tabela teams)
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({ name, color, created_by: user.id })
    .select("id")
    .single()

  if (teamErr || !team?.id) return

  // 2) vincula no torneio (tournament_teams)
  await supabase.from("tournament_teams").insert({
    tournament_id: tournamentId,
    team_id: team.id,
  })

  revalidatePath(`/admin/torneios/${tournamentId}`)
  revalidatePath(`/torneios/${tournamentId}`)
}

async function generateBracketAction(formData: FormData) {
  "use server"
  const { supabase } = await assertAdmin()

  const tournamentId = String(formData.get("tournament_id") || "")

  // pega equipes do torneio
  const { data: tt } = await supabase
    .from("tournament_teams")
    .select("team_id, teams(name)")
    .eq("tournament_id", tournamentId)

  const teamIds = (tt ?? []).map((x: any) => x.team_id).filter(Boolean)

  if (teamIds.length < 2) return

  // limpa matches antigos (opcional)
  await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId)

  // embaralha simples
  const shuffled = [...teamIds].sort(() => Math.random() - 0.5)

  // cria rodada 1 (pares)
  const rows: any[] = []
  let matchIndex = 1
  for (let i = 0; i < shuffled.length; i += 2) {
    const team1 = shuffled[i]
    const team2 = shuffled[i + 1] ?? null

    // BYE: se ímpar, team1 avança (você pode tratar isso criando match com winner definido)
    rows.push({
      tournament_id: tournamentId,
      round: 1,
      match_index: matchIndex++,
      team1_id: team1,
      team2_id: team2,
      status: team2 ? "pending" : "finished",
      winner_team_id: team2 ? null : team1,
      reason: team2 ? null : "bye",
    })
  }

  await supabase.from("tournament_matches").insert(rows)

  // opcional: mudar status do torneio pra in_progress
  await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", tournamentId)

  revalidatePath(`/admin/torneios/${tournamentId}`)
  revalidatePath(`/torneios/${tournamentId}`)
}

async function deleteTournamentAction(tournamentId: string) {
  "use server"
  const { supabase } = await assertAdmin()

  await supabase.from("tournament_matches").delete().eq("tournament_id", tournamentId)
  await supabase.from("tournament_teams").delete().eq("tournament_id", tournamentId)
  await supabase.from("tournaments").delete().eq("id", tournamentId)

  revalidatePath("/admin/torneios")
  revalidatePath("/torneios")
}

export default async function AdminTournamentManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await assertAdmin()

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single()

  if (!tournament) redirect("/admin/torneios")

  const { data: teams } = await supabase
    .from("tournament_teams")
    .select("team_id, teams(id,name,color)")
    .eq("tournament_id", id)

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("id, round, match_index, status, team1_id, team2_id, winner_team_id, reason")
    .eq("tournament_id", id)
    .order("round", { ascending: true })
    .order("match_index", { ascending: true })

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: "Rascunho", color: "bg-yellow-100 text-yellow-800" },
    registration: { label: "Inscrições", color: "bg-green-100 text-green-800" },
    in_progress: { label: "Em andamento", color: "bg-blue-100 text-blue-800" },
    completed: { label: "Finalizado", color: "bg-gray-100 text-gray-800" },
  }

  const statusInfo =
    statusMap[tournament.status] ??
    ({
      label: tournament.status ?? "Desconhecido",
      color: "bg-gray-100 text-gray-800",
    } as const)

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin/torneios">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-6 w-6 text-purple-600" />
                {tournament.name}
              </h1>
              <div className="mt-1">
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/torneios/${id}`}>Ver página pública</Link>
            </Button>
            <DeleteTournamentButton tournamentId={id} tournamentName={tournament.name} deleteAction={deleteTournamentAction} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* CONFIG */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateTournamentAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={id} />

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input name="name" defaultValue={tournament.name ?? ""} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  defaultValue={tournament.status ?? "draft"}
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="registration">registration</option>
                  <option value="in_progress">in_progress</option>
                  <option value="completed">completed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Máx. equipes</label>
                <Input name="max_teams" type="number" defaultValue={tournament.max_teams ?? ""} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Início das inscrições</label>
                <Input
                  name="registration_starts_at"
                  type="datetime-local"
                  defaultValue={tournament.registration_starts_at ? new Date(tournament.registration_starts_at).toISOString().slice(0, 16) : ""}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fim das inscrições</label>
                <Input
                  name="registration_ends_at"
                  type="datetime-local"
                  defaultValue={tournament.registration_ends_at ? new Date(tournament.registration_ends_at).toISOString().slice(0, 16) : ""}
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* EQUIPES */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipes ({teams?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createTeamAction} className="flex flex-col md:flex-row gap-2">
              <input type="hidden" name="tournament_id" value={id} />
              <Input name="team_name" placeholder="Nome da equipe" />
              <Input name="team_color" placeholder="#7c3aed" defaultValue="#7c3aed" />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Criar e incluir
              </Button>
            </form>

            {!teams || teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma equipe ainda. Crie uma acima.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {teams.map((row: any) => (
                  <div key={row.team_id} className="flex items-center justify-between rounded-lg border bg-white p-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.teams?.color ?? "#999" }} />
                      <span className="font-medium">{row.teams?.name ?? row.team_id}</span>
                    </div>
                    <Badge variant="outline">{row.team_id}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CHAVES */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brackets className="h-5 w-5" />
              Chaves / Partidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={generateBracketAction} className="flex justify-end">
              <input type="hidden" name="tournament_id" value={id} />
              <Button type="submit" variant="outline">
                Gerar chaves (rodada 1)
              </Button>
            </form>

            {!matches || matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma partida gerada ainda.</p>
            ) : (
              <div className="space-y-2">
                {matches.map((m: any) => (
                  <div key={m.id} className="rounded-lg border bg-white p-3 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        Rodada {m.round} • Match {m.match_index}
                      </div>
                      <div className="text-muted-foreground">
                        team1: {m.team1_id ?? "-"} • team2: {m.team2_id ?? "-"}
                      </div>
                      {m.winner_team_id ? (
                        <div className="text-muted-foreground">
                          winner: {m.winner_team_id} {m.reason ? `(${m.reason})` : ""}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant="outline">{m.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
