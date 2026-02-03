import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Crown } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle, ItemGroup } from "@/components/ui/item"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { TournamentBracket } from "@/components/tournament-bracket"

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
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="h-6 w-6 text-purple-600" />
                Chaveamento do Torneio
              </CardTitle>
              <CardDescription>
                Acompanhe todas as partidas e o avanco das equipes ate a final
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TournamentBracket
                matches={matches || []}
                tournamentId={params.id}
                isAdmin={isAdmin}
                status={tournament.status}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

