import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, ArrowRight, Play, Settings, Shuffle, Crown, Eye } from "lucide-react"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { BracketManager } from "@/components/BracketManager"

export default async function GerenciarTorneioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.is_admin) {
    redirect("/quiz")
  }

  // Get tournament details
  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      *,
      winner:teams!tournaments_winner_team_id_fkey (
        id,
        name,
        color
      )
    `
    )
    .eq("id", id)
    .single()

  if (!tournament) {
    redirect("/admin/torneios")
  }

  // Get participants
  const { data: participants } = await supabase
    .from("tournament_participants")
    .select(
      `
      *,
      teams (
        id,
        name,
        color,
        leader_id
      )
    `
    )
    .eq("tournament_id", id)
    .order("seed")

  // Get matches
  const { data: matches } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      team1:teams!tournament_matches_team1_id_fkey (
        id,
        name,
        color
      ),
      team2:teams!tournament_matches_team2_id_fkey (
        id,
        name,
        color
      ),
      winner:teams!tournament_matches_winner_team_id_fkey (
        id,
        name,
        color
      )
    `
    )
    .eq("tournament_id", id)
    .order("round_number")
    .order("match_number")

  // Get all teams for manual assignment
  const { data: allTeams } = await supabase.from("teams").select("id, name, color").order("name")

  async function generateBracket() {
    "use server"
    const supabase = await createClient()

    // Call the RPC function to generate bracket
    const { error } = await supabase.rpc("generate_tournament_bracket", { tournament_uuid: id })

    if (error) {
      console.error("[v0] Error generating bracket:", error)
    }

    revalidatePath(`/admin/torneios/${id}`)
  }

  async function startTournament() {
    "use server"
    const supabase = await createClient()

    await supabase.from("tournaments").update({ status: "in_progress" }).eq("id", id)

    revalidatePath(`/admin/torneios/${id}`)
  }

  async function updateMatchTeams(formData: FormData) {
    "use server"
    const supabase = await createClient()

    const matchId = formData.get("match_id") as string
    const team1Id = formData.get("team1_id") as string
    const team2Id = formData.get("team2_id") as string

    await supabase
      .from("tournament_matches")
      .update({
        team1_id: team1Id || null,
        team2_id: team2Id || null,
      })
      .eq("id", matchId)

    revalidatePath(`/admin/torneios/${id}`)
  }

  async function setMatchWinner(formData: FormData) {
    "use server"
    const supabase = await createClient()

    const matchId = formData.get("match_id") as string
    const winnerId = formData.get("winner_id") as string

    // Get match details
    const { data: match } = await supabase.from("tournament_matches").select("*").eq("id", matchId).single()

    if (!match) return

    // Update match
    await supabase
      .from("tournament_matches")
      .update({
        winner_team_id: winnerId,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId)

    // Advance winner to next match
    if (match.next_match_id) {
      const { data: nextMatch } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("id", match.next_match_id)
        .single()

      if (nextMatch) {
        const updateField = nextMatch.team1_id ? "team2_id" : "team1_id"
        await supabase
          .from("tournament_matches")
          .update({ [updateField]: winnerId })
          .eq("id", match.next_match_id)
      }
    } else {
      // This was the final - update tournament winner
      await supabase.from("tournaments").update({ status: "completed", winner_team_id: winnerId }).eq("id", id)
    }

    revalidatePath(`/admin/torneios/${id}`)
  }

  // Group matches by round
  const matchesByRound: Record<number, any[]> = {}
  matches?.forEach((match: any) => {
    if (!matchesByRound[match.round_number]) {
      matchesByRound[match.round_number] = []
    }
    matchesByRound[match.round_number].push(match)
  })

  const totalRounds = matches && matches.length > 0 ? Math.max(...matches.map((m: any) => m.round_number)) : 0

  const getRoundName = (round: number, total: number) => {
    if (round === total) return "Final"
    if (round === total - 1) return "Semifinal"
    if (round === total - 2) return "Quartas de Final"
    if (round === total - 3) return "Oitavas de Final"
    return `Rodada ${round}`
  }

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    registration: { label: "Inscricoes Abertas", variant: "default" },
    in_progress: { label: "Em Andamento", variant: "secondary" },
    completed: { label: "Finalizado", variant: "outline" },
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{tournament.name}</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de Chaveamento</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={statusMap[tournament.status].variant}>{statusMap[tournament.status].label}</Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/torneios/${id}/assistir`}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Publico
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/torneios">Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-purple-600" />
                  {tournament.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {participants?.length || 0}/{tournament.max_teams} equipes
                  </span>
                  <span>Modo: {tournament.competition_mode.toUpperCase()}</span>
                </CardDescription>
              </div>
              {tournament.status === "completed" && tournament.winner && (
                <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-400">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="text-xs font-medium text-yellow-800">Campeao</p>
                      <p className="text-lg font-bold text-yellow-900">{tournament.winner.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {tournament.status === "registration" && participants && participants.length >= 2 && (
                <>
                  {(!matches || matches.length === 0) && (
                    <form action={generateBracket}>
                      <Button type="submit">
                        <Shuffle className="h-4 w-4 mr-2" />
                        Gerar Chaveamento Automatico
                      </Button>
                    </form>
                  )}
                  {matches && matches.length > 0 && (
                    <form action={startTournament}>
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar Torneio
                      </Button>
                    </form>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participants List */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Equipes Participantes</CardTitle>
            <CardDescription>
              {participants?.length || 0} de {tournament.max_teams} vagas preenchidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!participants || participants.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma equipe inscrita ainda</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                {participants.map((participant: any, index: number) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-white"
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: participant.teams.color }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{participant.teams.name}</p>
                      <p className="text-xs text-muted-foreground">Seed #{participant.seed}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bracket Management */}
        {matches && matches.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6 text-purple-600" />
                Gerenciar Chaveamento
              </h2>
            </div>

            {Object.entries(matchesByRound)
              .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
              .map(([round, roundMatches]) => (
                <Card key={round} className="border-2">
                  <CardHeader>
                    <CardTitle className="text-xl">{getRoundName(Number.parseInt(round), totalRounds)}</CardTitle>
                    <CardDescription>{roundMatches.length} partida(s)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {roundMatches.map((match: any) => (
                        <Card key={match.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium">Partida {match.match_number}</span>
                              <Badge
                                variant={
                                  match.status === "completed"
                                    ? "outline"
                                    : match.status === "in_progress"
                                      ? "secondary"
                                      : "default"
                                }
                              >
                                {match.status === "pending" && "Aguardando"}
                                {match.status === "in_progress" && "Em Jogo"}
                                {match.status === "completed" && "Finalizada"}
                              </Badge>
                            </div>

                            {/* Team 1 */}
                            <div className="space-y-3">
                              <div
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  match.winner_team_id === match.team1_id
                                    ? "bg-green-100 border-2 border-green-400"
                                    : "bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-8 w-8 rounded-full"
                                    style={{ backgroundColor: match.team1?.color || "#ccc" }}
                                  />
                                  <span className="font-medium">{match.team1?.name || "A definir"}</span>
                                </div>
                                {match.winner_team_id === match.team1_id && (
                                  <Trophy className="h-5 w-5 text-green-600" />
                                )}
                              </div>

                              <div className="flex justify-center">
                                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                              </div>

                              {/* Team 2 */}
                              <div
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  match.winner_team_id === match.team2_id
                                    ? "bg-green-100 border-2 border-green-400"
                                    : "bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="h-8 w-8 rounded-full"
                                    style={{ backgroundColor: match.team2?.color || "#ccc" }}
                                  />
                                  <span className="font-medium">{match.team2?.name || "A definir"}</span>
                                </div>
                                {match.winner_team_id === match.team2_id && (
                                  <Trophy className="h-5 w-5 text-green-600" />
                                )}
                              </div>
                            </div>

                            {/* Admin Actions */}
                            <div className="mt-4 space-y-2">
                              {/* Manual Team Assignment */}
                              {match.status === "pending" && (
                                <form action={updateMatchTeams} className="space-y-2">
                                  <input type="hidden" name="match_id" value={match.id} />
                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      name="team1_id"
                                      className="text-sm p-2 rounded border bg-white"
                                      defaultValue={match.team1_id || ""}
                                    >
                                      <option value="">Equipe 1...</option>
                                      {allTeams?.map((team: any) => (
                                        <option key={team.id} value={team.id}>
                                          {team.name}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      name="team2_id"
                                      className="text-sm p-2 rounded border bg-white"
                                      defaultValue={match.team2_id || ""}
                                    >
                                      <option value="">Equipe 2...</option>
                                      {allTeams?.map((team: any) => (
                                        <option key={team.id} value={team.id}>
                                          {team.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <Button type="submit" size="sm" variant="outline" className="w-full">
                                    Definir Equipes
                                  </Button>
                                </form>
                              )}

                              {/* Start Match */}
                              {match.status === "pending" && match.team1_id && match.team2_id && (
                                <Button className="w-full" size="sm" asChild>
                                  <Link href={`/torneios/${id}/partida/${match.id}`}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Iniciar Partida
                                  </Link>
                                </Button>
                              )}

                              {/* Manual Winner Selection */}
                              {match.status !== "completed" && match.team1_id && match.team2_id && (
                                <form action={setMatchWinner} className="flex gap-2">
                                  <input type="hidden" name="match_id" value={match.id} />
                                  <select name="winner_id" className="flex-1 text-sm p-2 rounded border bg-white">
                                    <option value="">Definir vencedor manual...</option>
                                    <option value={match.team1_id}>{match.team1?.name}</option>
                                    <option value={match.team2_id}>{match.team2?.name}</option>
                                  </select>
                                  <Button type="submit" size="sm" variant="secondary">
                                    Definir
                                  </Button>
                                </form>
                              )}

                              {/* View Match */}
                              {match.status === "in_progress" && (
                                <Button className="w-full" size="sm" variant="outline" asChild>
                                  <Link href={`/torneios/${id}/partida/${match.id}`}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Partida
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* No Bracket Yet */}
        {(!matches || matches.length === 0) && tournament.status === "registration" && (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chaveamento nao gerado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {participants && participants.length >= 2
                  ? "Clique em 'Gerar Chaveamento Automatico' para criar as partidas"
                  : "Aguarde pelo menos 2 equipes se inscreverem"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
