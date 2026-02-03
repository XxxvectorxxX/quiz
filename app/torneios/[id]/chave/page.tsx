import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Share2, ArrowLeft, Crown } from "lucide-react"
import Link from "next/link"
import { TournamentBracket } from "@/components/tournament-bracket"

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Página pública do chaveamento do torneio.
 * Acessível sem login - qualquer pessoa com o link pode visualizar.
 */
export default async function ChaveTorneioPage({ params }: PageProps) {
  const { id: tournamentId } = await params
  const supabase = await createClient()

  const { data: tournament } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      status,
      competition_mode,
      max_teams,
      invite_code,
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
    notFound()
  }

  const { data: matches } = await supabase
    .from("tournament_matches")
    .select(
      `
      *,
      team1:teams!tournament_matches_team1_id_fkey (id, name, color),
      team2:teams!tournament_matches_team2_id_fkey (id, name, color),
      winner:teams!tournament_matches_winner_team_id_fkey (id, name, color)
    `,
    )
    .eq("tournament_id", tournamentId)
    .order("round_number")
    .order("match_number")

  const statusLabel =
    tournament.status === "registration"
      ? "Inscrições Abertas"
      : tournament.status === "in_progress"
        ? "Em Andamento"
        : "Finalizado"

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/torneios">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torneios
              </Link>
            </Button>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent truncate max-w-[200px] sm:max-w-none">
              {tournament.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground px-3 py-1.5 rounded-full bg-muted">
              {statusLabel}
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/torneios/${tournamentId}`}>
                Ver torneio completo
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {/* Campeão em destaque (quando finalizado) */}
        {tournament.status === "completed" && tournament.winner && (
          <Card className="mb-6 border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="py-6">
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Crown className="h-12 w-12 text-yellow-600 shrink-0" />
                <div className="text-center">
                  <p className="text-sm font-medium text-yellow-800 uppercase tracking-wider">Campeão do torneio</p>
                  <p className="text-2xl md:text-3xl font-black text-yellow-900">{tournament.winner.name}</p>
                </div>
                <div
                  className="w-14 h-14 rounded-full shrink-0 shadow-md"
                  style={{ backgroundColor: tournament.winner.color }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Título da chave */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-8 w-8 text-purple-600" />
              Chaveamento
            </h2>
            <p className="text-muted-foreground mt-1">
              {tournament.name} • Modo {tournament.competition_mode?.toUpperCase()}
            </p>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Compartilhe este link para quem quiser apenas visualizar a chave
          </p>
        </div>

        {/* Chave em tela cheia - modo somente visualização (não admin) */}
        <Card className="border-2 overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <TournamentBracket
              matches={matches || []}
              tournamentId={tournamentId}
              isAdmin={false}
              status={tournament.status}
            />
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href={`/torneios/${tournamentId}`}>Ver torneio completo</Link>
          </Button>
          <Button asChild>
            <Link href="/torneios">Ver todos os torneios</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
