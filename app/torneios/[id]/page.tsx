import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Users, Crown, Share2, Ticket } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle, ItemGroup } from "@/components/ui/item"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { TournamentBracket } from "@/components/tournament-bracket"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TorneioDetalhePage({ params }: PageProps) {
  const { id: tournamentId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user
    ? (await supabase.from("profiles").select("*").eq("id", user.id).single()).data
    : null

  const isLoggedIn = !!user && !!profile
  const isAdmin = profile?.is_admin ?? false

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
    .eq("id", tournamentId)
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
    .eq("tournament_id", tournamentId)
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
    .eq("tournament_id", tournamentId)
    .order("round_number")
    .order("match_number")

  // Check if user's team is participating and get user teams with names (apenas quando logado)
  const { data: userTeamsData } = await supabase
    .from("teams")
    .select("id, name")
    .eq("leader_id", user?.id ?? "")
  const participantTeamIds = new Set((participants || []).map((p: any) => p.team_id))
  const availableTeams = (userTeamsData || []).filter((t) => !participantTeamIds.has(t.id))

  const canJoin =
    isLoggedIn &&
    tournament.status === "registration" &&
    participants &&
    participants.length < tournament.max_teams &&
    availableTeams.length > 0

  async function joinTournament(formData: FormData) {
    "use server"
    const supabase = await createClient()
    const teamId = formData.get("team_id") as string
    const tid = formData.get("tournament_id") as string
    if (!tid || !teamId) return

    const { count } = await supabase
      .from("tournament_participants")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tid)

    const seed = (count || 0) + 1

    await supabase.from("tournament_participants").insert({
      tournament_id: tid,
      team_id: teamId,
      seed,
    })

    redirect(`/torneios/${tid}`)
  }

  async function startTournament(formData: FormData) {
    "use server"
    const supabase = await createClient()
    const tid = formData.get("tournament_id") as string
    if (!tid) return

    await supabase.rpc("generate_tournament_bracket", { tournament_uuid: tid })
    redirect(`/torneios/${tid}`)
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-3">
 https://routellm.abacus.ai/v1/chat/completions         <Link href="/quiz">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Quiz Bíblico
            </h1>
          </Link>
          <div className="flex items-center gap-2">
            {(tournament.status === "in_progress" || tournament.status === "completed") && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/torneios/${tournamentId}/chave`}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Ver chave
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/torneios">Voltar</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Tournament Header */}
        <Card className="mb-6 border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{tournament.name}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-4 text-base">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {participants?.length || 0}/{tournament.max_teams} equipes
                  </span>
                  <span>Modo: {tournament.competition_mode.toUpperCase()}</span>
                  {tournament.status === "registration" && tournament.invite_code && (
                    <span className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                      <Ticket className="h-4 w-4 text-purple-600" />
                      Código para equipes: <strong className="font-mono text-lg text-purple-700">{tournament.invite_code}</strong>
                    </span>
                  )}
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

            {/* Join Tournament ou CTA para quem está de fora */}
            <Card>
              <CardHeader>
                <CardTitle>Inscrever Equipe</CardTitle>
                <CardDescription>
                  {isLoggedIn
                    ? "Escolha uma equipe para participar do torneio"
                    : "Faça login para inscrever sua equipe neste torneio"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isLoggedIn ? (
                  <div className="space-y-4 text-center py-4">
                    <p className="text-muted-foreground">
                      Você está visualizando este torneio. Entre na sua conta para inscrever uma equipe.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button asChild className="w-full sm:w-auto">
                        <Link href={`/auth/login?redirect=/torneios/${tournamentId}`}>Entrar</Link>
                      </Button>
                      <Button variant="outline" asChild className="w-full sm:w-auto">
                        <Link href={`/auth/cadastro?redirect=/torneios/${tournamentId}`}>Criar conta</Link>
                      </Button>
                    </div>
                  </div>
                ) : canJoin ? (
                  <form action={joinTournament} className="space-y-4">
                    <input type="hidden" name="tournament_id" value={tournamentId} />
                    <select name="team_id" className="w-full p-3 rounded-lg border bg-white" required>
                      <option value="">Selecione uma equipe...</option>
                      {availableTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
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

                {isLoggedIn && isAdmin && tournament.status === "registration" && participants && participants.length >= 2 && (
                  <form action={startTournament} className="mt-4">
                    <input type="hidden" name="tournament_id" value={tournamentId} />
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
                tournamentId={tournamentId}
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

