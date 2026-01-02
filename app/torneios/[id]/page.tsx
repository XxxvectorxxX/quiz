import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, ArrowRight, Crown } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle, ItemGroup } from "@/components/ui/item"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export default async function TorneioDetalhePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
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
    `,
    )
    .eq("id", params.id)
    .single()

  if (!tournament) {
    redirect("/torneios")
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
    `,
    )
    .eq("tournament_id", params.id)
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
    `,
    )
    .eq("tournament_id", params.id)
    .order("round_number")
    .order("match_number")

  const isAdmin = profile.is_admin

  // Check if user's team is participating
  const userTeams = await supabase.from("teams").select("id").eq("leader_id", user.id)

  const canJoin =
    tournament.status === "registration" &&
    participants &&
    participants.length < tournament.max_teams &&
    userTeams.data &&
    userTeams.data.length > 0 &&
    !participants.some((p: any) => userTeams.data.some((ut) => ut.id === p.team_id))

  async function joinTournament(formData: FormData) {
    "use server"
    const supabase = await createClient()
    const teamId = formData.get("team_id") as string

    // Get current participant count
    const { count } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", params.id)

    const seed = (count || 0) + 1

    await supabase.from("tournament_participants").insert({
      tournament_id: params.id,
      team_id: teamId,
      seed,
    })

    redirect(`/torneios/${params.id}`)
  }

  async function startTournament() {
    "use server"
    const supabase = await createClient()

    // Call function to generate bracket
    await supabase.rpc("generate_tournament_bracket", { tournament_uuid: params.id })

    redirect(`/torneios/${params.id}`)
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

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/quiz">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Quiz Bíblico
            </h1>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/torneios">Voltar</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{tournament.name}</CardTitle>
                <CardDescription className="flex items-center gap-4 text-base">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {participants?.length || 0}/{tournament.max_teams} equipes
                  </span>
                  <span>Modo: {tournament.competition_mode.toUpperCase()}</span>
                </CardDescription>
              </div>
              <Badge
                variant={tournament.status === "completed" ? "outline" : "default"}
                className="text-base px-4 py-2"
              >
                {tournament.status === "registration" && "Inscrições Abertas"}
                {tournament.status === "in_progress" && "Em Andamento"}
                {tournament.status === "completed" && "Finalizado"}
              </Badge>
            </div>
          </CardHeader>
          {tournament.status === "completed" && tournament.winner && (
            <CardContent>
              <div className="p-6 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-400">
                <div className="flex items-center gap-4">
                  <Crown className="h-12 w-12 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">Campeão do Torneio</p>
                    <p className="text-2xl font-bold text-yellow-900">{tournament.winner.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Registration Phase */}
        {tournament.status === "registration" && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Participants List */}
            <Card>
              <CardHeader>
                <CardTitle>Equipes Inscritas</CardTitle>
                <CardDescription>
                  {participants?.length || 0} de {tournament.max_teams} vagas preenchidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!participants || participants.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <Users className="h-12 w-12" />
                      </EmptyMedia>
                      <EmptyTitle>Nenhuma equipe inscrita</EmptyTitle>
                      <EmptyDescription>Seja o primeiro a se inscrever neste torneio!</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <ItemGroup>
                    {participants.map((participant: any, index: number) => (
                      <Item key={participant.id}>
                        <ItemMedia>
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: participant.teams.color }}
                          >
                            {index + 1}
                          </div>
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{participant.teams.name}</ItemTitle>
                          <ItemDescription>Seed #{participant.seed}</ItemDescription>
                        </ItemContent>
                      </Item>
                    ))}
                  </ItemGroup>
                )}
              </CardContent>
            </Card>

            {/* Join Tournament */}
            <Card>
              <CardHeader>
                <CardTitle>Inscrever Equipe</CardTitle>
                <CardDescription>Escolha uma equipe para participar do torneio</CardDescription>
              </CardHeader>
              <CardContent>
                {canJoin ? (
                  <form action={joinTournament} className="space-y-4">
                    <select name="team_id" className="w-full p-3 rounded-lg border bg-white" required>
                      <option value="">Selecione uma equipe...</option>
                      {userTeams.data
                        ?.filter((ut) => !participants?.some((p: any) => p.team_id === ut.id))
                        .map(async (team) => {
                          const { data: teamData } = await supabase.from("teams").select("*").eq("id", team.id).single()
                          return (
                            <option key={team.id} value={team.id}>
                              {teamData?.name}
                            </option>
                          )
                        })}
                    </select>
                    <Button type="submit" className="w-full">
                      Inscrever Equipe
                    </Button>
                  </form>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      {tournament.status !== "registration"
                        ? "Inscrições encerradas"
                        : participants && participants.length >= tournament.max_teams
                          ? "Torneio completo"
                          : "Você não tem equipes disponíveis"}
                    </p>
                  </div>
                )}

                {isAdmin && tournament.status === "registration" && participants && participants.length >= 2 && (
                  <form action={startTournament} className="mt-4">
                    <Button type="submit" variant="default" className="w-full">
                      Iniciar Torneio
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tournament Bracket */}
        {(tournament.status === "in_progress" || tournament.status === "completed") && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-purple-600" />
              Chaveamento
            </h2>

            {Object.keys(matchesByRound).length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <Trophy className="h-12 w-12" />
                      </EmptyMedia>
                      <EmptyTitle>Gerando chaveamento...</EmptyTitle>
                      <EmptyDescription>As partidas estão sendo criadas</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(matchesByRound)
                  .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
                  .map(([round, roundMatches]) => (
                    <Card key={round} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-xl">{getRoundName(Number.parseInt(round), totalRounds)}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          {roundMatches.map((match: any) => (
                            <Card key={match.id} className="border">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-muted-foreground">Partida {match.match_number}</span>
                                  <Badge
                                    variant={match.status === "completed" ? "outline" : "default"}
                                    className="text-xs"
                                  >
                                    {match.status === "pending" && "Aguardando"}
                                    {match.status === "in_progress" && "Em Jogo"}
                                    {match.status === "completed" && "Finalizada"}
                                  </Badge>
                                </div>

                                <div className="space-y-3">
                                  {/* Team 1 */}
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
                                    {match.status === "completed" && (
                                      <span className="text-lg font-bold">{match.team1_score}</span>
                                    )}
                                  </div>

                                  <div className="flex justify-center">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
                                    {match.status === "completed" && (
                                      <span className="text-lg font-bold">{match.team2_score}</span>
                                    )}
                                  </div>
                                </div>

                                {isAdmin && match.status === "pending" && match.team1_id && match.team2_id && (
                                  <Button className="w-full mt-3" size="sm" asChild>
                                    <Link href={`/torneios/${params.id}/partida/${match.id}`}>Iniciar Partida</Link>
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
